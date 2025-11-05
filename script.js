/* Bookify — client-side book manager
   Features: add, edit, delete, search, filter, sort, localStorage persistence, import/export JSON.
*/

const STORAGE_KEY = "bookify_books_v1";

let books = [];
let editingIndex = -1;
const elements = {
  booksWrapper: document.getElementById("booksWrapper"),
  emptyNote: document.getElementById("emptyNote"),
  statTotal: document.getElementById("statTotal"),
  statAuthors: document.getElementById("statAuthors"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modalTitle"),
  bookForm: document.getElementById("bookForm"),
  title: document.getElementById("title"),
  author: document.getElementById("author"),
  yearInput: document.getElementById("yearInput"),
  genre: document.getElementById("genre"),
  pages: document.getElementById("pages"),
  desc: document.getElementById("desc"),
  openAddBtn: document.getElementById("openAddBtn"),
  quickSearch: document.getElementById("quickSearch"),
  filterYear: document.getElementById("filterYear"),
  sortSelect: document.getElementById("sortSelect"),
  importFile: document.getElementById("importFile"),
  yearSpan: document.getElementById("year")
};

// initialize UI small bits
elements.yearSpan.textContent = new Date().getFullYear();

// load
loadFromStorage();
renderBooks();

// open modal handlers
elements.openAddBtn.addEventListener("click", () => openModal());
document.getElementById("importFile").addEventListener("change", handleImportFile);

// keyboard: Esc closes modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ---------- Core functions ----------
function saveToStorage(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function loadFromStorage(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    books = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to load books:", err);
    books = [];
  }
}

function renderBooks(list = books){
  elements.booksWrapper.innerHTML = "";
  if (!list.length){ elements.emptyNote.style.display = "block"; }
  else { elements.emptyNote.style.display = "none"; }

  list.forEach((b, idx) => {
    const card = document.createElement("div");
    card.className = "card-book";

    // cover color generated from title
    const cover = document.createElement("div");
    cover.className = "book-cover";
    cover.style.background = coverGradient(b.title || b.author || "Book");
    cover.textContent = coverInitials(b.title, b.author);

    const meta = document.createElement("div");
    meta.className = "book-meta";
    meta.innerHTML = `
      <h4>${escapeHtml(b.title || "Untitled")}</h4>
      <p>${escapeHtml(b.author || "Unknown author")} • ${b.year || "-" } • ${b.genre || ""}</p>
      <p style="margin-top:8px;color:var(--muted);font-size:13px">${(b.desc||"").slice(0,120)}</p>
    `;

    const actions = document.createElement("div");
    actions.className = "book-actions";
    actions.innerHTML = `
      <button class="icon-btn" title="Edit" onclick="editBook(${idx})"><i class="fa-solid fa-pen-to-square"></i></button>
      <button class="icon-btn" title="Delete" onclick="deleteBook(${idx})"><i class="fa-solid fa-trash"></i></button>
      <button class="icon-btn" title="Details" onclick="showDetails(${idx})"><i class="fa-solid fa-eye"></i></button>
    `;

    meta.appendChild(actions);
    card.appendChild(cover);
    card.appendChild(meta);
    elements.booksWrapper.appendChild(card);
  });

  updateStats(list);
}

function updateStats(list){
  elements.statTotal.textContent = list.length;
  const authors = new Set(list.map(b => (b.author || "").trim()).filter(Boolean));
  elements.statAuthors.textContent = authors.size;
}

// ---------- CRUD ----------
function openModal(book = null){
  editingIndex = -1;
  elements.modalTitle.textContent = book ? "Edit Book" : "Add New Book";
  elements.bookForm.reset();
  if (book){
    editingIndex = book._index ?? -1;
    elements.title.value = book.title || "";
    elements.author.value = book.author || "";
    elements.yearInput.value = book.year || "";
    elements.genre.value = book.genre || "";
    elements.pages.value = book.pages || "";
    elements.desc.value = book.desc || "";
  }
  elements.modal.classList.remove("hidden");
  elements.title.focus();
}
function closeModal(){
  elements.modal.classList.add("hidden");
  editingIndex = -1;
}

function saveBook(){
  const t = elements.title.value.trim();
  const a = elements.author.value.trim();
  const y = elements.yearInput.value ? String(elements.yearInput.value).trim() : "";
  const g = elements.genre.value.trim();
  const p = elements.pages.value ? Number(elements.pages.value) : undefined;
  const d = elements.desc.value.trim();

  if (!t || !a){
    alert("Title and Author are required.");
    return;
  }

  const bookObj = { title: t, author: a, year: y, genre: g, pages: p, desc: d };

  if (editingIndex >= 0){
    books[editingIndex] = bookObj;
  } else {
    books.unshift(bookObj); // newest at top
  }

  saveToStorage();
  renderBooks(applyCurrentFiltersSort());
  closeModal();
}

// delete
function deleteBook(index){
  if (!confirm("Delete this book?")) return;
  books.splice(index,1);
  saveToStorage();
  renderBooks(applyCurrentFiltersSort());
}

// edit
function editBook(index){
  openModal({...books[index], _index:index});
}

// details
function showDetails(index){
  const b = books[index];
  alert(`${b.title}\n— ${b.author}\nYear: ${b.year || "—"}\nGenre: ${b.genre || "—"}\nPages: ${b.pages || "—"}\n\n${b.desc || ""}`);
}

// ---------- Search / Filter / Sort ----------
function searchBooks(){
  const q = elements.quickSearch.value.trim().toLowerCase();
  const filtered = books.filter(b =>
    (b.title||"").toLowerCase().includes(q) ||
    (b.author||"").toLowerCase().includes(q)
  );
  const further = applySortToList(applyYearFilter(filtered));
  renderBooks(further);
}

function filterByYear(){
  renderBooks(applyCurrentFiltersSort());
}

function applySort(){
  renderBooks(applyCurrentFiltersSort());
}

function applyCurrentFiltersSort(){
  let list = books.slice();
  // quick search
  const q = elements.quickSearch.value.trim().toLowerCase();
  if (q) list = list.filter(b => (b.title||"").toLowerCase().includes(q) || (b.author||"").toLowerCase().includes(q));
  // year filter
  list = applyYearFilter(list);
  // sort
  list = applySortToList(list);
  return list;
}
function applyYearFilter(list){
  const y = elements.filterYear.value.trim();
  if (!y) return list;
  return list.filter(b => String(b.year || "").includes(y));
}
function applySortToList(list){
  const mode = elements.sortSelect.value;
  if (mode === "newest") list.sort((a,b) => Number(b.year||0) - Number(a.year||0));
  else if (mode === "oldest") list.sort((a,b) => Number(a.year||0) - Number(b.year||0));
  else if (mode === "title-az") list.sort((a,b) => (a.title||"").localeCompare(b.title||""));
  else if (mode === "title-za") list.sort((a,b) => (b.title||"").localeCompare(a.title||""));
  return list;
}

// ---------- Utils ----------
function coverInitials(title, author){
  if (!title && !author) return "BK";
  const tParts = (title||"").split(" ").filter(Boolean);
  if (tParts.length >= 2) return (tParts[0][0]+tParts[1][0]).toUpperCase();
  if (title && title.length >= 2) return title.slice(0,2).toUpperCase();
  if (author) return author.split(" ").map(p=>p[0]).slice(0,2).join("").toUpperCase();
  return "BK";
}
function coverGradient(seed){
  // simple deterministic color from a string
  let h = 0;
  for (let i=0;i<seed.length;i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const c1 = `hsl(${h},70%,52%)`;
  const c2 = `hsl(${(h+35) % 360},70%,52%)`;
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ---------- Import / Export ----------
function exportJSON(){
  const data = JSON.stringify(books, null, 2);
  const blob = new Blob([data], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "bookify_export.json"; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

function importJSON(){
  elements.importFile.click();
}

function handleImportFile(e){
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error("Invalid format");
      // basic validation
      const imported = data.map(d => ({
        title: d.title||"",
        author: d.author||"",
        year: d.year||"",
        genre: d.genre||"",
        pages: d.pages||"",
        desc: d.desc||""
      }));
      books = imported.concat(books); // add imported to top
      saveToStorage();
      renderBooks(applyCurrentFiltersSort());
      alert("Imported successfully.");
    } catch (err){
      alert("Failed to import: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

function clearAllBooks(){
  if (!confirm("Clear all books from Bookify? This action cannot be undone.")) return;
  books = [];
  saveToStorage();
  renderBooks();
}

