const storeKey = "recipe-wiki-overrides-v2";
const data = window.RECIPE_WIKI_DATA;
const overrides = JSON.parse(localStorage.getItem(storeKey) || "{}");

const titleCatalog = {
  "1.1": ["Chicken Stock", "鸡高汤"],
  "1.2": ["Chicken Clear Soup", "鸡清汤"],
  "1.3": ["Palinka Stock", "帕林卡高汤"],
  "1.4": ["Base Stock", "基础高汤"],
  "2.1": ["Chicken Sauce", "鸡肉酱汁"],
  "2.6": ["San Sauce", "San 酱"],
  "2.8": ["Pepper Sauce", "胡椒酱"],
  "2.10": ["Mapo Sauce", "麻婆酱"],
  "2.11": ["Tonkatsu Sauce", "炸猪排酱"],
  "2.12": ["Sha Sauce", "Sha 酱"],
  "2.14": ["Pork Sauce", "猪肉酱汁"],
  "2.15": ["Duck Sauce", "鸭肉酱汁"],
  "2.16": ["Zhajiang Sauce", "炸酱"],
  "2.21": ["Seasoned Sauce", "调味酱"],
  "2.29.101": ["101 Tonkatsu Sauce", "101 炸猪排酱"],
  "3.5": ["Beef Prep", "牛肉预处理"],
  "3.7": ["Chicken Prep", "鸡肉预处理"],
  "3.12": ["Sha Prep", "Sha 预处理"],
  "3.13": ["Shaoxing Prep", "绍兴预处理"],
  "4.1": ["Brownie", "布朗尼"],
  "4.2": ["Sauced Item", "酱制品"],
  "4.3": ["Raspberry Item", "覆盆子项目"],
  "4.7": ["Shokupan", "日式吐司"],
  "25.11.24": ["Production Batch 1000", "1000 批量生产"],
  "7.1": ["Daikon", "白萝卜"],
  "8.1": ["Ramen", "拉面"],
  "8.2": ["Soba", "荞麦面"],
  "8.3": ["Udon", "乌冬面"],
  "9.1": ["Sichuan Oil", "四川油"],
  "9.2": ["Sichuan Spice Mix", "四川香料粉"],
  "9.3.101": ["101 Sichuan Mix", "101 四川调料"],
  "9.4.101": ["101 Sichuan Sauce", "101 四川酱"],
  "9.6": ["101 Spice Base", "101 香料底"],
  "9.8": ["Sichuan Seasoning", "四川调味料"],
  "9.9": ["Raspberry Seasoning", "覆盆子调味料"],
};

const categoryNames = {
  Alaplevek: ["Stocks", "高汤"],
  Szószok: ["Sauces", "酱汁"],
  "Előkészítés": ["Prep", "预处理"],
  Ételek: ["Dishes", "菜品"],
  Egyéb: ["Other", "其他"],
};

const glossary = [
  ["csirke", "chicken", "鸡"],
  ["alaplé", "stock", "高汤"],
  ["erőleves", "clear soup", "清汤"],
  ["sertés", "pork", "猪肉"],
  ["marha", "beef", "牛肉"],
  ["kacsa", "duck", "鸭肉"],
  ["gyömbér", "ginger", "姜"],
  ["újhagyma", "spring onion", "葱"],
  ["vörös hagyma", "red onion", "红洋葱"],
  ["hagyma", "onion", "洋葱"],
  ["répa", "carrot", "胡萝卜"],
  ["fokhagyma", "garlic", "蒜"],
  ["cukor", "sugar", "糖"],
  ["só", "salt", "盐"],
  ["víz", "water", "水"],
  ["szójaszósz", "soy sauce", "酱油"],
  ["japán szója", "Japanese soy sauce", "日式酱油"],
  ["fehérbors", "white pepper", "白胡椒"],
  ["shitake", "shiitake", "香菇"],
  ["megjegyzés", "note", "备注"],
  ["műveletek", "method", "步骤"],
  ["felforralom", "bring to a boil", "煮沸"],
  ["forralom", "boil", "煮"],
  ["leszűröm", "strain", "过滤"],
  ["hűteni", "cool", "冷却"],
  ["csomagolni", "pack", "包装"],
  ["rendelés", "ordering", "订货"],
  ["beszállító", "supplier", "供应商"],
];

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
  methodList: document.querySelector("#methodList"),
  englishText: document.querySelector("#englishText"),
  sourceText: document.querySelector("#sourceText"),
  chineseText: document.querySelector("#chineseText"),
  historyCount: document.querySelector("#historyCount"),
  historyList: document.querySelector("#historyList"),
  editButton: document.querySelector("#editButton"),
  exportButton: document.querySelector("#exportButton"),
  editDialog: document.querySelector("#editDialog"),
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
  const catalog = titleCatalog[recipe.number] || [];
  return {
    ...recipe,
    titleEn: recipe.titleEn || catalog[0] || "",
    titleZh: recipe.titleZh || catalog[1] || "",
    ...(overrides[recipe.id] || {}),
  };
}

function currentRecipes() {
  return data.recipes.map(applyOverride);
}

function cleanImportedText(text) {
  return (text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/([.!?])\s+/g, "$1\n")
    .trim();
}

function phraseTranslate(text, target) {
  let output = cleanImportedText(text);
  for (const [hu, en, zh] of glossary) {
    output = output.replace(new RegExp(hu, "gi"), target === "zh" ? zh : en);
  }
  return output;
}

function recipeTitle(recipe, language = els.languageSelect.value) {
  if (language === "zh" && recipe.titleZh) return recipe.titleZh;
  if (language === "hu") return recipe.title || inferImportedTitle(recipe) || recipe.titleEn || "Untitled";
  return recipe.titleEn || inferImportedTitle(recipe) || recipe.title || "Untitled";
}

function categoryLabel(category, language = els.languageSelect.value) {
  const labels = categoryNames[category];
  if (!labels) return category;
  if (language === "zh") return labels[1];
  if (language === "hu") return category;
  return labels[0];
}

function inferImportedTitle(recipe) {
  const text = cleanImportedText(recipe.content || "");
  const match = text.match(/^(.{4,90}?)(?:\s+alapanyag|\s+suly|\s+súly|\s+Megjegyzés)/i);
  if (!match) return "";
  return match[1].replace(/\s+/g, " ").trim();
}

function autoIngredients(recipe) {
  if (recipe.ingredients?.length) return recipe.ingredients;
  const text = cleanImportedText(recipe.content || "");
  const matches = [...text.matchAll(/(\d+(?:[,.]\d+)?)\s*(kg|g|l|liter|ml|db)\s+([^.;:]{2,55})/gi)];
  return matches.slice(0, 18).map((match) => `${match[1]} ${match[2]} ${match[3].trim()}`);
}

function autoMethod(recipe) {
  if (recipe.method?.length) return recipe.method;
  const text = cleanImportedText(recipe.content || "");
  const start = text.search(/műveletek|forral|főz|süt|kever|szűr|csomagol/i);
  const relevant = start >= 0 ? text.slice(start) : text;
  return relevant
    .split(/\n|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 10)
    .slice(0, 10);
}

function localizedIngredients(recipe) {
  const language = els.languageSelect.value;
  const base = autoIngredients(recipe);
  if (recipe.ingredientsEn?.length && language === "en") return recipe.ingredientsEn;
  if (recipe.ingredientsZh?.length && language === "zh") return recipe.ingredientsZh;
  if (language === "hu") return base;
  return base.map((item) => phraseTranslate(item, language));
}

function localizedMethod(recipe) {
  const language = els.languageSelect.value;
  const base = autoMethod(recipe);
  if (recipe.methodEn?.length && language === "en") return recipe.methodEn;
  if (recipe.methodZh?.length && language === "zh") return recipe.methodZh;
  if (language === "hu") return base;
  return base.map((item) => phraseTranslate(item, language));
}

function englishIngredients(recipe) {
  return recipe.ingredientsEn?.length ? recipe.ingredientsEn : autoIngredients(recipe).map((item) => phraseTranslate(item, "en"));
}

function englishMethod(recipe) {
  return recipe.methodEn?.length ? recipe.methodEn : autoMethod(recipe).map((item) => phraseTranslate(item, "en"));
}

function renderFilters() {
  const categories = ["All", ...data.categories];
  els.categorySelect.innerHTML = categories
    .map((category) => `<option value="${category}">${category === "All" ? "All" : categoryLabel(category, "en")}</option>`)
    .join("");
  els.recipeCount.textContent = `${data.recipes.length} recipes`;
  els.sourceMeta.textContent = `${data.meta.source} · ${data.meta.totalPages} pages`;
}

function filteredRecipes() {
  const query = els.searchInput.value.trim().toLowerCase();
  const category = els.categorySelect.value;

  return currentRecipes().filter((recipe) => {
    const haystack = [
      recipe.number,
      recipe.title,
      recipe.titleZh,
      recipe.titleEn,
      categoryLabel(recipe.category, "en"),
      categoryLabel(recipe.category, "zh"),
      recipe.category,
      recipe.content,
      ...(recipe.ingredients || []),
      ...(recipe.method || []),
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

function renderArray(container, items, emptyText) {
  container.innerHTML = "";
  const values = items.length ? items : [emptyText];
  values.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    container.appendChild(li);
  });
}

function renderDetail() {
  const recipe = currentRecipes().find((item) => item.id === selectedId) || currentRecipes()[0];
  if (!recipe) return;

  const ingredients = localizedIngredients(recipe);
  const method = localizedMethod(recipe);
  const history = recipe.history || [];
  const hungarian = cleanImportedText(recipe.hungarianNotes || recipe.content || "");
  const english = recipe.englishNotes || [
    `${recipeTitle(recipe, "en")} is the English working title.`,
    "The ingredient and method sections are editable English working translations based on the Hungarian source.",
    "Quantities must be reviewed by the kitchen before operational use.",
  ].join("\n");
  const chinese = recipe.chineseNotes || [
    `${recipeTitle(recipe, "zh")} 是中文工作名称。`,
    "配料和步骤是根据匈牙利语原文整理的工作翻译，正式使用前需要厨房校对。",
  ].join("\n");

  els.recipeTitle.textContent = recipeTitle(recipe);
  els.recipeNumber.textContent = recipe.number;
  els.recipeCategory.textContent = categoryLabel(recipe.category);
  els.recipeStatus.textContent = recipe.status === "reviewed" ? "Reviewed" : "Needs review";
  els.recipePages.textContent = recipe.sourcePages?.join(", ") || "-";
  els.ingredientCount.textContent = `${ingredients.length} items`;
  els.historyCount.textContent = `${history.length} entries`;
  els.englishText.textContent = english;
  els.sourceText.textContent = hungarian;
  els.chineseText.textContent = chinese;

  renderArray(els.ingredientsList, ingredients, "No ingredients have been cleaned yet.");
  renderArray(els.methodList, method, "No method steps have been cleaned yet.");

  els.historyList.innerHTML = history.map((entry) => `
    <article>
      <strong>${entry.summary}</strong>
      <span>${entry.date} · ${entry.user}</span>
    </article>
  `).join("");
}

function render() {
  renderList();
  renderDetail();
}

function openEditor() {
  const recipe = currentRecipes().find((item) => item.id === selectedId);
  if (!recipe) return;

  els.editTitleEn.value = recipe.titleEn || "";
  els.editTitleHu.value = recipe.title || "";
  els.editTitleZh.value = recipe.titleZh || "";
  els.editIngredients.value = englishIngredients(recipe).join("\n");
  els.editMethod.value = englishMethod(recipe).join("\n");
  els.editHungarianNotes.value = recipe.hungarianNotes || cleanImportedText(recipe.content || "");
  els.editChineseNotes.value = recipe.chineseNotes || "";
  els.editSummary.value = "";
  els.editDialog.showModal();
}

function saveEditor() {
  const recipe = currentRecipes().find((item) => item.id === selectedId);
  if (!recipe) return;

  const now = new Date().toISOString().slice(0, 10);
  const summary = els.editSummary.value.trim() || "Updated English primary recipe and translations";
  const ingredientsEn = els.editIngredients.value.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const methodEn = els.editMethod.value.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const next = {
    titleEn: els.editTitleEn.value.trim() || recipe.titleEn,
    title: els.editTitleHu.value.trim() || recipe.title,
    titleZh: els.editTitleZh.value.trim() || recipe.titleZh,
    ingredientsEn,
    methodEn,
    ingredients: ingredientsEn,
    method: methodEn,
    hungarianNotes: els.editHungarianNotes.value.trim(),
    chineseNotes: els.editChineseNotes.value.trim(),
    status: "reviewed",
    updatedAt: now,
    history: [
      { date: now, user: "Restaurant team", summary },
      ...(recipe.history || []),
    ],
  };

  overrides[recipe.id] = { ...(overrides[recipe.id] || {}), ...next };
  localStorage.setItem(storeKey, JSON.stringify(overrides));
  els.editDialog.close();
  render();
}

function exportData() {
  const payload = JSON.stringify({ ...data, recipes: currentRecipes() }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "recipe-wiki-english-primary-export.json";
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
els.editButton.addEventListener("click", openEditor);
els.saveEdit.addEventListener("click", saveEditor);
els.exportButton.addEventListener("click", exportData);

renderFilters();
render();
