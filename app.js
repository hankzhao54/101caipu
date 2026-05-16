const storeKey = "recipe-wiki-overrides-v3";
const userStoreKey = "recipe-wiki-current-user-v1";
const data = window.RECIPE_WIKI_DATA;
const overrides = JSON.parse(localStorage.getItem(storeKey) || "{}");
let currentUser = JSON.parse(localStorage.getItem(userStoreKey) || "null");

const categoryNames = {
  Stocks: ["Stocks", "高汤"],
  Sauces: ["Sauces", "酱汁"],
  Prep: ["Prep", "预处理"],
  "Bakery and sweets": ["Bakery and sweets", "甜点和烘焙"],
  Dumplings: ["Dumplings", "饺子"],
  "Ferments and pickles": ["Ferments and pickles", "发酵和腌制"],
  Cakes: ["Cakes", "糕点"],
  Noodles: ["Noodles", "面条"],
  "Spices and oils": ["Spices and oils", "香料和油"],
  "Nuts and garnish": ["Nuts and garnish", "坚果和配料"],
};

const els = {
  recipeCount: document.querySelector("#recipeCount"),
  searchInput: document.querySelector("#searchInput"),
  languageSelect: document.querySelector("#languageSelect"),
  categorySelect: document.querySelector("#categorySelect"),
  recipeList: document.querySelector("#recipeList"),
  sourceMeta: document.querySelector("#sourceMeta"),
  recipeTitle: document.querySelector("#recipeTitle"),
  recipeNumber: document.querySelector("#recipeNumber"),
  recipeCategory: document.querySelector("#recipeCategory"),
  recipeStatus: document.querySelector("#recipeStatus"),
  recipePages: document.querySelector("#recipePages"),
  ingredientCount: document.querySelector("#ingredientCount"),
  ingredientsList: document.querySelector("#ingredientsList"),
  ingredientsHuList: document.querySelector("#ingredientsHuList"),
  ingredientsZhList: document.querySelector("#ingredientsZhList"),
  englishText: document.querySelector("#englishText"),
  sourceText: document.querySelector("#sourceText"),
  chineseText: document.querySelector("#chineseText"),
  historyCount: document.querySelector("#historyCount"),
  historyList: document.querySelector("#historyList"),
  userBadge: document.querySelector("#userBadge"),
  loginButton: document.querySelector("#loginButton"),
  editButton: document.querySelector("#editButton"),
  exportButton: document.querySelector("#exportButton"),
  editDialog: document.querySelector("#editDialog"),
  loginDialog: document.querySelector("#loginDialog"),
  loginName: document.querySelector("#loginName"),
  loginRole: document.querySelector("#loginRole"),
  saveLogin: document.querySelector("#saveLogin"),
  editTitleZh: document.querySelector("#editTitleZh"),
  editTitleHu: document.querySelector("#editTitleHu"),
  editTitleEn: document.querySelector("#editTitleEn"),
  editIngredients: document.querySelector("#editIngredients"),
  editMethod: document.querySelector("#editMethod"),
  editHungarianNotes: document.querySelector("#editHungarianNotes"),
  editChineseNotes: document.querySelector("#editChineseNotes"),
  editSummary: document.querySelector("#editSummary"),
  saveEdit: document.querySelector("#saveEdit"),
};

let selectedId = data.recipes[0]?.id;

function applyOverride(recipe) {
  return { ...recipe, ...(overrides[recipe.id] || {}) };
}

function currentRecipes() {
  return data.recipes.map(applyOverride);
}

function cleanText(text) {
  return (text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function recipeTitle(recipe, language = els.languageSelect.value) {
  if (language === "zh") return recipe.titleZh || recipe.titleEn || recipe.title || "Untitled";
  if (language === "hu") return recipe.title || recipe.titleEn || "Untitled";
  return recipe.titleEn || recipe.title || "Untitled";
}

function categoryLabel(category, language = els.languageSelect.value) {
  const labels = categoryNames[category];
  if (!labels) return category;
  return language === "zh" ? labels[1] : labels[0];
}

function ingredientsFor(recipe) {
  const language = els.languageSelect.value;
  if (language === "zh" && recipe.ingredientsZh?.length) return recipe.ingredientsZh;
  if (language === "hu" && recipe.ingredients?.length) return recipe.ingredients;
  return recipe.ingredientsEn?.length ? recipe.ingredientsEn : recipe.ingredients || [];
}

function ingredientsForLanguage(recipe, language) {
  if (language === "zh") return recipe.ingredientsZh?.length ? recipe.ingredientsZh : [];
  if (language === "hu") return recipe.ingredients?.length ? recipe.ingredients : [];
  return recipe.ingredientsEn?.length ? recipe.ingredientsEn : recipe.ingredients || [];
}

function stepsFor(recipe, language) {
  if (language === "zh") return recipe.methodZh?.length ? recipe.methodZh : [];
  if (language === "hu") return recipe.method?.length ? recipe.method : [];
  return recipe.methodEn?.length ? recipe.methodEn : [];
}

function formatSteps(lines, emptyText) {
  const cleaned = (lines || []).map((line) => cleanText(String(line).replace(/^\d+\.\s*/, ""))).filter(Boolean);
  if (!cleaned.length) return emptyText;
  return cleaned.map((line, index) => `${index + 1}. ${line}`).join("\n");
}

function renderArray(container, items, emptyText) {
  container.innerHTML = "";
  const values = items.length ? items : [emptyText];
  values.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    container.appendChild(li);
  });
}

function renderUser() {
  if (currentUser?.name) {
    els.userBadge.textContent = `${currentUser.name} · ${currentUser.role}`;
    els.loginButton.textContent = "Switch user";
    els.editButton.disabled = false;
  } else {
    els.userBadge.textContent = "Guest";
    els.loginButton.textContent = "Sign in";
  }
  els.editButton.disabled = false;
}

function renderFilters() {
  const categories = ["All", ...data.categories];
  els.categorySelect.innerHTML = categories
    .map((category) => `<option value="${category}">${category === "All" ? "All" : categoryLabel(category, "en")}</option>`)
    .join("");
  els.recipeCount.textContent = `${data.recipes.length} recipes`;
  const sourceSize = data.meta.totalPages ? `${data.meta.totalPages} pages` : `${data.meta.totalParagraphs || 0} Word paragraphs`;
  els.sourceMeta.textContent = `${data.meta.source} · ${sourceSize}`;
}

function filteredRecipes() {
  const query = els.searchInput.value.trim().toLowerCase();
  const category = els.categorySelect.value;
  return currentRecipes().filter((recipe) => {
    const haystack = [
      recipe.number,
      recipe.title,
      recipe.titleEn,
      recipe.titleZh,
      recipe.category,
      recipe.categoryHu,
      recipe.categoryZh,
      recipe.content,
      ...(recipe.ingredients || []),
      ...(recipe.ingredientsEn || []),
      ...(recipe.ingredientsZh || []),
      ...(recipe.method || []),
      ...(recipe.methodEn || []),
      ...(recipe.methodZh || []),
    ].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (category === "All" || recipe.category === category);
  });
}

function renderList() {
  const recipes = filteredRecipes();
  if (!recipes.some((recipe) => recipe.id === selectedId)) selectedId = recipes[0]?.id || data.recipes[0]?.id;
  els.recipeList.innerHTML = recipes.map((recipe) => `
    <button class="recipe-item ${recipe.id === selectedId ? "active" : ""}" data-id="${recipe.id}" type="button">
      <strong>${recipe.number} ${recipeTitle(recipe)}</strong>
      <span>${categoryLabel(recipe.category)} · ${recipe.status === "reviewed" ? "Reviewed" : "Needs review"}</span>
    </button>
  `).join("");
}

function renderDetail() {
  const recipe = currentRecipes().find((item) => item.id === selectedId) || currentRecipes()[0];
  if (!recipe) return;

  const ingredients = ingredientsForLanguage(recipe, "en");
  const ingredientsHu = ingredientsForLanguage(recipe, "hu");
  const ingredientsZh = ingredientsForLanguage(recipe, "zh");
  const history = recipe.history || [];

  els.recipeTitle.textContent = recipeTitle(recipe);
  els.recipeNumber.textContent = recipe.number;
  els.recipeCategory.textContent = categoryLabel(recipe.category);
  els.recipeStatus.textContent = recipe.status === "reviewed" ? "Reviewed" : "Needs review";
  els.recipePages.textContent = recipe.sourcePages?.join(", ") || "-";
  els.ingredientCount.textContent = `${ingredients.length} items`;
  els.historyCount.textContent = `${history.length} entries`;

  renderArray(els.ingredientsList, ingredients, "No ingredients have been cleaned yet.");
  renderArray(els.ingredientsHuList, ingredientsHu, "No Hungarian source ingredients have been found yet.");
  renderArray(els.ingredientsZhList, ingredientsZh, "No Chinese ingredients have been cleaned yet.");
  els.englishText.textContent = formatSteps(stepsFor(recipe, "en"), "No English steps have been cleaned yet.");
  els.sourceText.textContent = formatSteps(stepsFor(recipe, "hu"), "No Hungarian source steps have been found yet.");
  els.chineseText.textContent = formatSteps(stepsFor(recipe, "zh"), "No Chinese steps have been cleaned yet.");

  els.historyList.innerHTML = history.map((entry) => `
    <article>
      <strong>${entry.summary}</strong>
      <span>${entry.date} · ${entry.user}</span>
    </article>
  `).join("");
}

function render() {
  renderUser();
  renderList();
  renderDetail();
}

function openLogin() {
  els.loginName.value = currentUser?.name || "";
  els.loginRole.value = currentUser?.role || "Kitchen";
  openModal(els.loginDialog);
}

function saveLogin() {
  const name = els.loginName.value.trim();
  if (!name) return;
  currentUser = { name, role: els.loginRole.value, signedInAt: new Date().toISOString() };
  localStorage.setItem(userStoreKey, JSON.stringify(currentUser));
  closeModal(els.loginDialog);
  render();
}

function openEditor() {
  if (!currentUser?.name) {
    openLogin();
    return;
  }
  const recipe = currentRecipes().find((item) => item.id === selectedId);
  if (!recipe) return;

  els.editTitleEn.value = recipe.titleEn || "";
  els.editTitleHu.value = recipe.title || "";
  els.editTitleZh.value = recipe.titleZh || "";
  els.editIngredients.value = (recipe.ingredientsEn || recipe.ingredients || []).join("\n");
  els.editMethod.value = stepsFor(recipe, "en").join("\n");
  els.editHungarianNotes.value = stepsFor(recipe, "hu").join("\n");
  els.editChineseNotes.value = stepsFor(recipe, "zh").join("\n");
  els.editSummary.value = "";
  openModal(els.editDialog);
}

function saveEditor() {
  const recipe = currentRecipes().find((item) => item.id === selectedId);
  if (!recipe) return;

  const now = new Date().toISOString().slice(0, 10);
  const summary = els.editSummary.value.trim() || "Updated recipe text";
  const ingredientsEn = els.editIngredients.value.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const methodEn = els.editMethod.value.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const methodHu = els.editHungarianNotes.value.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const methodZh = els.editChineseNotes.value.split(/\n/).map((line) => line.trim()).filter(Boolean);

  const next = {
    titleEn: els.editTitleEn.value.trim() || recipe.titleEn,
    title: els.editTitleHu.value.trim() || recipe.title,
    titleZh: els.editTitleZh.value.trim() || recipe.titleZh,
    ingredientsEn,
    ingredients: recipe.ingredients || [],
    methodEn,
    method: methodHu,
    methodZh,
    status: "reviewed",
    updatedAt: now,
    history: [
      { date: now, user: currentUser?.name || "Restaurant team", summary },
      ...(recipe.history || []),
    ],
  };

  overrides[recipe.id] = { ...(overrides[recipe.id] || {}), ...next };
  localStorage.setItem(storeKey, JSON.stringify(overrides));
  closeModal(els.editDialog);
  render();
}

function openModal(modal) {
  modal.hidden = false;
  modal.classList.add("open");
}

function closeModal(modal) {
  modal.classList.remove("open");
  modal.hidden = true;
}

function exportData() {
  const payload = JSON.stringify({ ...data, recipes: currentRecipes() }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "recipe-wiki-export.json";
  link.click();
  URL.revokeObjectURL(url);
}

els.recipeList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  selectedId = button.dataset.id;
  render();
});

els.searchInput.addEventListener("input", render);
els.categorySelect.addEventListener("change", render);
els.languageSelect.addEventListener("change", render);
els.loginButton.addEventListener("click", openLogin);
els.saveLogin.addEventListener("click", saveLogin);
els.editButton.addEventListener("click", openEditor);
els.saveEdit.addEventListener("click", saveEditor);
els.exportButton.addEventListener("click", exportData);
document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    closeModal(document.querySelector(`#${button.dataset.close}`));
  });
});

renderFilters();
render();
