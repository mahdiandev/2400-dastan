const categories = window.STORY_DATA.categories;
const stories = window.STORY_DATA.stories;
window.STORY_CATEGORIES = window.STORY_CATEGORIES || {};

const $ = (s) => document.querySelector(s);
const categoryGrid = $('#categoryGrid');
const storySection = $('#storySection');
const storyGrid = $('#storyGrid');
const categoryHeader = $('#categoryHeader');
const emptyState = $('#emptyState');
const searchInput = $('#searchInput');
const clearSearch = $('#clearSearch');
const searchBox = $('#searchBox');
const reader = $('#storyReader');
const readerTitle = $('#readerTitle');
const readerContent = $('#readerContent');
const storyReaderCategory = $('#storyReaderCategory');
const storyReaderStory = $('#storyReaderStory');
const readerBack = $('#readerBack');
const shareStory = $('#shareStory');
const shareToast = $('#shareToast');
const hero = $('.hero');
const heroTitle = $('.hero-title');
const heroTitleMain = $('.hero-title-main');
const heroTitleSub = $('.hero-title-sub');
const heroTitleCount = $('.hero-title-count');

document.querySelectorAll('.site-logo-link').forEach(link => link.addEventListener('click', e => { e.preventDefault(); goHome(); }));

let selectedCategory = null;
let currentStoryId = null;
const loadedCategories = new Set();
const loadingCategories = new Map();
const catMap = new Map(categories.map(c => [c.id, c]));
const storyMetaMap = new Map(stories.map(s => [Number(s.id), s]));
const faNum = n => Number(n).toLocaleString('fa-IR');

function homeUrl() { return window.location.pathname.split('?')[0].split('#')[0]; }
function categoryUrl(id) { return `${homeUrl()}?category=${encodeURIComponent(id)}`; }
function storyUrl(categoryId, storyId) { return `${homeUrl()}?category=${encodeURIComponent(categoryId)}&story=${encodeURIComponent(storyId)}`; }
function navigateTo(url) { history.pushState({}, '', url); }
function getRoute() {
  const params = new URLSearchParams(window.location.search);
  const categoryId = Number(params.get('category'));
  const storyId = Number(params.get('story'));
  return { categoryId: Number.isFinite(categoryId) && categoryId > 0 ? categoryId : null, storyId: Number.isFinite(storyId) && storyId > 0 ? storyId : null };
}

function setSearchVisible(visible) {
  searchBox.hidden = !visible;
}
function updateSearchPlaceholder() {
  if (selectedCategory) {
    const name = catMap.get(selectedCategory)?.name || '';
    searchInput.placeholder = `جستجو در دسته بندی ${name}`;
    searchInput.setAttribute('aria-label', `جستجو در میان عنوان های دسته بندی ${name}`);
  } else {
    searchInput.placeholder = 'جست‌وجو در عنوان داستان‌ها...';
    searchInput.setAttribute('aria-label', 'جست‌وجو در عنوان داستان‌ها');
  }
}

function categoryFile(id) { return catMap.get(id)?.code ? `${catMap.get(id).code}.js` : null; }
async function loadCategory(id) {
  if (loadedCategories.has(id)) return window.STORY_CATEGORIES[id] || [];
  if (loadingCategories.has(id)) return loadingCategories.get(id);
  const file = categoryFile(id);
  if (!file) return [];
  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-category="${id}"]`);
    if (existing) {
      const done = () => { loadedCategories.add(id); resolve(window.STORY_CATEGORIES[id] || []); };
      existing.addEventListener('load', done, {once:true});
      existing.addEventListener('error', () => reject(new Error('خطا در بارگذاری دسته‌بندی')), {once:true});
      return;
    }
    const script = document.createElement('script');
    script.src = file;
    script.dataset.category = id;
    script.onload = () => { loadedCategories.add(id); resolve(window.STORY_CATEGORIES[id] || []); };
    script.onerror = () => reject(new Error('خطا در بارگذاری دسته‌بندی'));
    document.head.appendChild(script);
  });
  loadingCategories.set(id, promise);
  try { return await promise; } finally { loadingCategories.delete(id); }
}

function getLoadedStoriesForCategory(id) { return window.STORY_CATEGORIES[id] || []; }
function storyCount(id) { return stories.reduce((n,s) => n + (Number(s.category_id) === Number(id) ? 1 : 0), 0); }

function renderCategories(pushUrl = false) {
  selectedCategory = null; currentStoryId = null;
  hero.hidden = false;
  heroTitle.classList.remove('category-mode');
  heroTitleMain.textContent = '۲۴۰۰ داستان کوتاه';
  heroTitleSub.textContent = 'رو براتون جمع‌آوری و دسته‌بندی کردیم 🔥';
  heroTitleSub.hidden = false;
  heroTitleCount.hidden = true;
  categoryHeader.hidden = true;
  storySection.hidden = true; categoryGrid.hidden = false; reader.hidden = true;
  categoryHeader.innerHTML = '';
  setSearchVisible(true); searchInput.value = ''; clearSearch.hidden = true; updateSearchPlaceholder();
  if (pushUrl) navigateTo(homeUrl());
  categoryGrid.innerHTML = categories.map(c => `<button class="category-card" data-category="${c.id}">
    <div class="cat-symbol" aria-hidden="true">✦</div>
    <span class="category-label">دسته بندی</span>
    <h3>${escapeHtml(c.name)}</h3>
    <p>${faNum(storyCount(c.id))} داستان</p>
  </button>`).join('');
  categoryGrid.querySelectorAll('[data-category]').forEach(btn => btn.addEventListener('click', () => openCategory(Number(btn.dataset.category), true)));
}

async function openCategory(id, pushUrl = false) {
  const category = catMap.get(id); if (!category) return;
  selectedCategory = id; currentStoryId = null; reader.hidden = true; categoryGrid.hidden = true; storySection.hidden = false;
  hero.hidden = false;
  setSearchVisible(true); searchInput.value = ''; clearSearch.hidden = true; updateSearchPlaceholder();
  const count = storyCount(id);
  heroTitle.classList.remove('category-mode');
  heroTitleMain.textContent = '۲۴۰۰ داستان کوتاه';
  heroTitleSub.textContent = `دسته بندی ${category.name}`;
  heroTitleSub.hidden = false;
  heroTitleCount.textContent = `${faNum(count)} داستان`;
  heroTitleCount.hidden = false;
  categoryHeader.hidden = true;
  if (pushUrl) navigateTo(categoryUrl(id));
  storyGrid.innerHTML = '<div class="loading-state">در حال بارگذاری داستان‌ها…</div>'; emptyState.hidden = true;
  window.scrollTo({top: 0, behavior: 'smooth'});
  try { await loadCategory(id); renderStories(); } catch { storyGrid.innerHTML = ''; emptyState.hidden = false; emptyState.querySelector('p').textContent = 'بارگذاری داستان‌ها انجام نشد.'; }
}

function renderStories() {
  const q = normalizeText(searchInput.value.trim());
  let list = selectedCategory ? getLoadedStoriesForCategory(selectedCategory) : stories;
  if (q) list = list.filter(s => normalizeText(s.title || '').includes(q));
  storyGrid.innerHTML = list.map(storyCard).join('');
  emptyState.hidden = list.length !== 0;
  emptyState.querySelector('p').textContent = q ? 'عنوان دیگری را امتحان کنید.' : selectedCategory ? 'داستانی در این دسته‌بندی پیدا نشد.' : 'داستانی پیدا نشد.';
  storyGrid.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => openStory(Number(el.dataset.open), true)));
}

function storyCard(s) {
  return `<article class="story-card" data-open="${s.id}" tabindex="0" role="button" aria-label="خواندن ${escapeHtml(s.title || 'داستان')}">
    <span class="story-label">داستان</span><h3 title="خواندن داستان">${escapeHtml(s.title || 'بدون عنوان')}</h3></article>`;
}

async function openStory(id, pushUrl = false) {
  const meta = storyMetaMap.get(Number(id)); if (!meta) return;
  try {
    const arr = await loadCategory(Number(meta.category_id));
    const s = arr.find(x => Number(x.id) === Number(id)); if (!s) return;
    currentStoryId = Number(id); selectedCategory = Number(s.category_id);
    hero.hidden = true;
    categoryGrid.hidden = true; storySection.hidden = true; reader.hidden = false; setSearchVisible(false);
    const categoryName = catMap.get(s.category_id)?.name || '';
    readerTitle.textContent = s.title || 'بدون عنوان';
    readerContent.textContent = s.content || '';
    storyReaderCategory.textContent = `دسته بندی ${categoryName}`;
    storyReaderStory.textContent = `داستان ${s.title || 'بدون عنوان'}`;
    readerBack.setAttribute('aria-label', `بازگشت به دسته بندی ${categoryName}`);
    readerBack.querySelector('.reader-back-label').textContent = `بازگشت به دسته بندی ${categoryName}`;
    if (pushUrl) navigateTo(storyUrl(s.category_id, s.id));
    window.scrollTo({top: 0, behavior: 'smooth'});
  } catch { /* keep current view if a story file fails */ }
}

function goHome() { navigateTo(homeUrl()); renderCategories(); window.scrollTo({top: 0, behavior: 'smooth'}); }
async function handleRoute() {
  const {categoryId, storyId} = getRoute();
  if (storyId && categoryId) { const meta = storyMetaMap.get(storyId); if (meta && Number(meta.category_id) === categoryId) { await openStory(storyId, false); return; } }
  if (categoryId && categories.some(c => Number(c.id) === categoryId)) { await openCategory(categoryId, false); return; }
  renderCategories(false);
}
function normalizeText(value) { return String(value).toLocaleLowerCase('fa-IR').replace(/ي/g,'ی').replace(/ى/g,'ی').replace(/ك/g,'ک').replace(/ۀ/g,'ه').replace(/\u200c/g,' '); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])); }

searchInput.addEventListener('input', async () => {
  const hasQuery = searchInput.value.trim().length > 0; clearSearch.hidden = !hasQuery;
  if (!hasQuery) { if (selectedCategory) renderStories(); else renderCategories(true); return; }
  if (reader.hidden) { categoryGrid.hidden = true; storySection.hidden = false; if (selectedCategory) renderStories(); else { storyGrid.innerHTML = '<div class="loading-state">در حال جستجو…</div>'; const ids = [...new Set(stories.filter(s => normalizeText(s.title || '').includes(normalizeText(searchInput.value.trim()))).map(s => Number(s.category_id)))]; await Promise.all(ids.map(loadCategory)); renderStories(); } }
});
clearSearch.addEventListener('click', () => { searchInput.value=''; clearSearch.hidden=true; if(selectedCategory) renderStories(); else renderCategories(true); });
$('#categoryBack').addEventListener('click', () => { navigateTo(homeUrl()); renderCategories(false); });
readerBack.addEventListener('click', () => { if(selectedCategory){ navigateTo(categoryUrl(selectedCategory)); openCategory(selectedCategory,false); } else { goHome(); } });
shareStory.addEventListener('click', async () => { if(!currentStoryId) return; const meta=storyMetaMap.get(Number(currentStoryId)); if(!meta) return; const url=new URL(storyUrl(meta.category_id,meta.id),window.location.href).href; try{ await navigator.clipboard.writeText(url); if(window.matchMedia('(max-width: 620px)').matches){ shareToast.classList.add('show'); clearTimeout(window.__shareToastTimer); window.__shareToastTimer=setTimeout(()=>shareToast.classList.remove('show'),1800); } else { const label=shareStory.querySelector('.share-story-label'); const original=label.textContent; label.textContent='لینک کپی شد'; clearTimeout(window.__shareLabelTimer); window.__shareLabelTimer=setTimeout(()=>label.textContent=original,1800); } }catch{window.prompt('لینک داستان را کپی کنید:',url);} });
document.addEventListener('keydown', e => { const card=e.target.closest?.('[data-open]'); if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openStory(Number(card.dataset.open),true);} });
window.addEventListener('popstate', handleRoute);
handleRoute();
