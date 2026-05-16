<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>101 Bistro Recipe Wiki</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main class="shell">
      <aside class="sidebar" aria-label="Recipe navigation">
        <div class="brand">
          <div>
            <p class="eyebrow">101 Bistro</p>
            <h1>Recipe Wiki</h1>
          </div>
          <span id="recipeCount" class="count"></span>
        </div>

        <label class="search">
          <span>Search</span>
          <input id="searchInput" type="search" placeholder="Name, ingredient, method..." />
        </label>

        <div class="controls">
          <label>
            <span>Working language</span>
            <select id="languageSelect">
              <option value="en">English</option>
              <option value="hu">Hungarian</option>
              <option value="zh">Chinese</option>
            </select>
          </label>
          <label>
            <span>Category</span>
            <select id="categorySelect"></select>
          </label>
        </div>

        <nav id="recipeList" class="recipe-list"></nav>
      </aside>

      <section class="detail">
        <header class="topbar">
          <div>
            <p id="sourceMeta" class="eyebrow"></p>
            <h2 id="recipeTitle"></h2>
          </div>
          <div class="actions">
            <button id="exportButton" type="button">Export data</button>
            <button id="editButton" type="button">Edit recipe</button>
          </div>
        </header>

        <div class="meta-grid">
          <article>
            <span>Code</span>
            <strong id="recipeNumber"></strong>
          </article>
          <article>
            <span>Category</span>
            <strong id="recipeCategory"></strong>
          </article>
          <article>
            <span>Status</span>
            <strong id="recipeStatus"></strong>
          </article>
          <article>
            <span>Source pages</span>
            <strong id="recipePages"></strong>
          </article>
        </div>

        <div class="content-grid">
          <section class="panel">
            <div class="panel-head">
              <h3>Ingredients</h3>
              <span id="ingredientCount"></span>
            </div>
            <ul id="ingredientsList" class="clean-list"></ul>
          </section>

          <section class="panel">
            <div class="panel-head">
              <h3>Method</h3>
            </div>
            <ol id="methodList" class="steps"></ol>
          </section>
        </div>

        <section class="panel full">
          <div class="panel-head">
            <h3>Translations</h3>
            <span>English first, Hungarian source, Chinese support</span>
          </div>
          <div class="translation-grid">
            <article>
              <h4>English working version</h4>
              <p id="englishText" class="source-text"></p>
            </article>
            <article>
              <h4>Hungarian original</h4>
              <p id="sourceText" class="source-text"></p>
            </article>
            <article>
              <h4>Chinese translation</h4>
              <p id="chineseText" class="source-text"></p>
            </article>
          </div>
        </section>

        <section class="panel full">
          <div class="panel-head">
            <h3>Change history</h3>
            <span id="historyCount"></span>
          </div>
          <div id="historyList" class="history"></div>
        </section>
      </section>
    </main>

    <dialog id="editDialog">
      <form method="dialog" class="editor">
        <header>
          <h3>Edit recipe</h3>
          <button id="closeDialog" value="cancel" type="submit" aria-label="Close">×</button>
        </header>
        <label>
          English name
          <input id="editTitleEn" />
        </label>
        <label>
          Hungarian name
          <input id="editTitleHu" />
        </label>
        <label>
          Chinese name
          <input id="editTitleZh" />
        </label>
        <label>
          English ingredients, one per line
          <textarea id="editIngredients" rows="7"></textarea>
        </label>
        <label>
          English method, one step per line
          <textarea id="editMethod" rows="7"></textarea>
        </label>
        <label>
          Hungarian notes or source corrections
          <textarea id="editHungarianNotes" rows="5"></textarea>
        </label>
        <label>
          Chinese notes
          <textarea id="editChineseNotes" rows="5"></textarea>
        </label>
        <label>
          Change note
          <input id="editSummary" placeholder="Example: corrected salt quantity for chicken broth" />
        </label>
        <menu>
          <button value="cancel">Cancel</button>
          <button id="saveEdit" value="default" type="button">Save changes</button>
        </menu>
      </form>
    </dialog>

    <script src="app-data.js"></script>
    <script src="app.js"></script>
  </body>
</html>
