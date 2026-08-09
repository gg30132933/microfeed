# Homepage Reformat Plan（henrywen.tw 風格延伸）

狀態：**規劃中，尚未實作**。本文件只列步驟，等你確認後才動工。

已確認的範圍決策：
- Nav 選單：**單層列表**（不做二層下拉）
- Hero：拿掉標題，**完全不留 h1**
- Tags：**自由輸入文字**，**支援點擊篩選**
- 首頁卡片：tags + **摘要 (excerpt)**
- Tag 篩選 v1：**不分頁**（一次列出全部符合的 items）

範圍外（不在這次計畫內）：nav 二層下拉、nav 連到 microfeed 內建頁面（microfeed 沒有頁面產生器）、tag 從預先定義清單挑選、tag 篩選時的真正分頁。

---

## Task 1：Hero 簡化 + 滿版寬度

### 目標
Hero 只顯示 description，拿掉標題與 subscribe 按鈕；hero 背景/區塊延伸到瀏覽器兩側到底（滿版），但文字內容維持可讀寬度。

### 影響檔案
- `edge-src/common/default_themes/web_feed.html`
- `edge-src/common/default_themes/web_header.html`

### 步驟

1. **`web_feed.html`**：把目前的
   ```html
   <section class="hero"{{#icon}} style="..."{{/icon}}>
     <h1>{{title}}</h1>
     {{#description}}<div class="description">{{{description}}}</div>{{/description}}
     {{#_microfeed.subscribe_methods.length}}
     <div class="subscribe-links">...</div>
     {{/_microfeed.subscribe_methods.length}}
   </section>
   ```
   改成：
   ```html
   <section class="hero"{{#icon}} style="..."{{/icon}}>
     <div class="hero-inner">
       {{#description}}<div class="description">{{{description}}}</div>{{/description}}
     </div>
   </section>
   ```
   - `{{#icon}} style="background-image: ..."{{/icon}}` inline style 保留不動（Task 之前已做好的 hero 背景圖功能）。
   - 如果 `description` 是空的，hero 會變成一個空的深色色塊——這是可接受的（channel 沒填 description 時本來就沒東西可顯示），不用額外處理空狀態。

2. **`web_header.html`** 的 `.hero` CSS 規則，新增 breakout + inner 容器：
   ```css
   .hero {
     background-color: var(--hero-bg);
     background-size: cover;
     background-position: center;
     color: #fff;
     text-align: center;
     padding: 5em 1.25em 4em;
     margin: 0 0 3em;
     /* breakout to full viewport width regardless of parent max-width */
     width: 100vw;
     margin-left: calc(50% - 50vw);
     margin-right: calc(50% - 50vw);
   }

   .hero-inner {
     max-width: 42em;
     margin: 0 auto;
   }
   ```
   - 拿掉舊的 `.hero h1`、`.hero .subscribe-links`、`.hero .pill` 規則（不再被使用，避免死 CSS）。
   - `.description` 規則裡原本的 `max-width: 42em; margin: 0 auto 1.6em;` 可以搬到 `.hero-inner`，`.description` 只留文字顏色/margin-bottom。

3. 檢查 `main { max-width: 760px; ... }` 是否會因為 hero 用了 `width:100vw` 而在有橫向捲軸的情況下產生換行/裁切問題（`100vw` 在有垂直捲軸的桌面瀏覽器上有時會比 `100%` 寬一點點，造成 1 條隱藏的水平捲軸）。如果測試時發現這個問題，加 `overflow-x: hidden` 在 `body` 上即可解決，是常見且安全的修法。

### 測試驗證
1. `npm run dev`（或現有的本地 wrangler dev 指令）啟動後開 `http://127.0.0.1:8788/`。
2. 用瀏覽器 DevTools 或截圖確認：hero 區塊背景從螢幕最左延伸到最右（沒有留白邊），但裡面的文字仍維持置中、寬度受限、好讀。
3. 確認 hero 裡面**沒有**任何標題文字或 subscribe 按鈕，只有 description（如果 channel description 有填的話）。
4. 確認 `<title>` 標籤（瀏覽器分頁標題）跟 nav bar 上的頻道名稱都還正常顯示（沒有把 title 資料整個拿掉，只是不在 hero 顯示）。
5. Resize 到手機寬度（375px）跟平板寬度，確認 hero 沒有產生水平捲軸（檢查 `document.documentElement.scrollWidth` 是否等於 `window.innerWidth`）。
6. 把 channel description 清空存檔，確認首頁不會壞掉（hero 變成一個沒有文字的深色/圖片色塊，layout 不跑版）。

---

## Task 2：Site-nav 多個選單項目（單層）

### 目標
在 `/admin/channels/primary/` 可以新增/編輯/刪除/排序一組「選單項目」（label + url），並顯示在前台所有頁面的 nav bar 上（brand 跟 subscribe pills 中間）。

### 資料模型
新增 channel 欄位：
```js
channel.navItems = [
  { id: 'xxxxxxxxxxx', label: '關於我', url: 'https://example.com/about' },
  { id: 'yyyyyyyyyyy', label: '服務項目', url: 'https://example.com/services' },
]
```
- 直接存進 channel 的 JSON blob（`channels.data`），**不需要 D1 schema migration**（跟現有的 `categories` 欄位做法一樣，見 `edge-src/models/FeedDb.js:159-169` 的 `initDb()` 裡 channel 物件範例，以及 `_putChannelToContent()` 在 `edge-src/models/FeedDb.js:365-380` 會把整個 channel 物件（除了 id/status/is_primary）序列化成 `data` 欄位）。
- `id` 用現有的 `randomShortUUID()`（`common-src/StringUtils.js`）產生，前端排序/刪除用它當 React key 跟比對用。

### 步驟

**A. Admin UI（`client-src/ClientAdminChannelApp/components/EditChannelApp/`）**

1. 新增子元件 `client-src/ClientAdminChannelApp/components/EditChannelApp/components/NavItemsEditor/index.jsx`，直接照抄 `client-src/ClientAdminSettingsApp/components/SubscribeSettingsApp/index.jsx` 的模式簡化：
   - Props：`navItems`（array）、`onChange(newNavItems)`。
   - 內部 state 不用自己存，用 controlled component（`navItems` 從 parent 的 `channel.navItems` 傳進來，改動時呼叫 `onChange`），比 `SubscribeSettingsApp` 自己存 state 更簡單，因為 `EditChannelApp` 本來就已經有一個 `channel` state 物件在管理所有欄位。
   - 每一列（`NavItemRow`）：
     - `AdminInput` for label
     - `AdminInput` for url
     - 上/下箭頭（複製 `SubscribeSettingsApp` 的 `moveCard` 邏輯：`array.splice(oldIndex,1)[0]` 再 `splice(newIndex,0,element)`）
     - 刪除按鈕（這裡不需要 `SubscribeSettingsApp` 的 soft-delete + Undo 機制，因為 nav item 沒有「這是預設不能刪的項目」的概念，直接用 `array.filter()` 移除即可，更簡單）
   - 「+ Add menu item」按鈕：`onChange([...navItems, {id: randomShortUUID(), label: '', url: ''}])`
   - 空的 label 或 url 先允許存檔（不擋），過濾邏輯留到後端渲染時處理（Step C）——admin 端不做欄位必填驗證，避免使用者存草稿時卡住。

2. 在 `EditChannelApp/index.jsx` 的 render() 裡（`client-src/ClientAdminChannelApp/components/EditChannelApp/index.jsx:206` 附近，`</div>` 收尾 `lh-page-card` 之後、`<details>` Podcast-specific fields 之前）新增一個 `<div className="lh-page-card">` 區塊放 `<NavItemsEditor navItems={channel.navItems || []} onChange={(navItems) => this.onUpdateChannelMeta('navItems', navItems)} />`，標題用 `<div className="lh-page-subtitle">Navigation menu</div>` 加一行說明文字（可仿照 `ExplainText`/`FormExplainTexts.js` 的模式，在 `CHANNEL_CONTROLS` 加一個新 key，但如果嫌麻煩，直接寫一行 plain text 說明也可以，不強制要完全比照既有的 i18n-ish 說明文字系統）。
3. 不需要改 `onSubmit`／POST 邏輯——`navItems` 會隨著 `channel` state 其他欄位一起被送到 `/admin/ajax/feed/`（`EditChannelApp/index.jsx:110` 的 `Requests.axiosPost('/admin/ajax/feed/', {channel: feed.channel})`），後端 `FeedDb._putChannelToContent()` 本來就是把整包 channel 物件序列化存檔，不需要额外改動。

**B. 前台資料組裝（`edge-src/models/FeedPublicJsonBuilder.js`）**

4. 在 `_buildPublicContentMicrofeedExtra()`（`edge-src/models/FeedPublicJsonBuilder.js:95-184`）加入：
   ```js
   const navItems = channel.navItems || [];
   microfeedExtra['nav_items'] = navItems.filter((n) => n.label && n.url);
   ```
   放在 `categories` 那段附近即可（過濾掉 label 或 url 是空字串的項目，避免前台渲染出空連結）。

**C. 前台渲染（`edge-src/common/default_themes/web_body_start.html`）**

5. 目前的 nav：
   ```html
   <nav class="site-nav">
     <a href="/" class="brand">...</a>
     {{#_microfeed.subscribe_methods.length}}
     <div class="nav-subscribe">...</div>
     {{/_microfeed.subscribe_methods.length}}
   </nav>
   ```
   改成三個區塊：brand、選單項目、subscribe pills：
   ```html
   <nav class="site-nav">
     <a href="/" class="brand">...</a>
     {{#_microfeed.nav_items.length}}
     <div class="nav-links">
       {{#_microfeed.nav_items}}
       <a href="{{url}}">{{label}}</a>
       {{/_microfeed.nav_items}}
     </div>
     {{/_microfeed.nav_items.length}}
     {{#_microfeed.subscribe_methods.length}}
     <div class="nav-subscribe">...</div>
     {{/_microfeed.subscribe_methods.length}}
   </nav>
   ```
6. **手機版收合選單**：因為 nav 現在可能有 brand + N 個連結 + subscribe pills 三組東西，窄螢幕會擠爆。用純 CSS 的 checkbox-hack 漢堡選單（不加任何 JS 套件）：
   - `web_body_start.html` 在 `.brand` 後面、`.nav-links` 前面加一個 `<input type="checkbox" id="nav-toggle" class="nav-toggle-checkbox"><label for="nav-toggle" class="nav-toggle-btn">☰</label>`
   - CSS（`web_header.html`）：預設 `.nav-toggle-checkbox, .nav-toggle-btn { display: none; }`；在 `@media (max-width: 780px)` 裡把 `.nav-toggle-btn` 顯示出來、`.nav-links` 改成 `display:none` 預設收合，`.nav-toggle-checkbox:checked ~ .nav-links { display: flex; ... }`（用 CSS 相鄰兄弟選擇器控制展開/收合，展開時改成直排 `flex-direction: column`，`position: absolute` 蓋在 nav 下方）。
   - 這是**已知、成熟的 CSS-only 手法**，不需要任何 JavaScript，符合現有主題檔案完全是靜態 HTML/CSS（唯一的 JS 是既有的 lazy-load script）的風格。

### 需要你確認/留意的點
- Nav 連結目前規劃是**單純的 `<a href>`，會整頁導轉**（不是 SPA 路由，microfeed 本來就是多頁 SSR，這樣最簡單也最符合現況）。
- 如果使用者已經自訂過（override）`webBodyStart` 這個 theme（在 Settings → Custom code），他們的自訂版本不會自動出現新 nav-links——這是既有 custom code 機制的限制，只影響有客製化過 body-start 的進階使用者，你目前的站台是用預設 theme，不受影響。

### 測試驗證
1. 進 `/admin/channels/primary/`，新增 3 筆選單項目（例如「關於我」→ `/about`、「服務項目」→ `https://example.com`、「聯絡」→ `mailto:test@example.com`），儲存後重新整理頁面，確認 3 筆資料還在（代表有正確存到 DB）。
2. 用上/下箭頭把第 3 筆移到第 1 筆，儲存後重新整理，確認順序有被記住。
3. 刪除其中一筆，儲存後重新整理，確認少了那一筆。
4. 開首頁 `http://127.0.0.1:8788/`，確認 nav bar 上依序出現：頻道 icon+title → 3 個選單連結（依你排序的順序）→ RSS/JSON subscribe pills。
5. 點其中一個選單連結，確認網址正確跳轉（外部連結開新分頁與否目前規劃不強制，維持預設同分頁行為）。
6. 開任一篇 item 的詳細頁（`/i/...`），確認同一組 nav 選單也有出現（因為 nav 在 `web_body_start.html`，是所有頁面共用的）。
7. 縮小視窗到手機寬度（375px），確認選單項目收合成漢堡按鈕，點擊後可以展開/收合。
8. 把某一筆選單項目的 label 留空、url 留空存檔，確認前台**不會**渲染出空的 `<a></a>`（驗證 Step 4 的 filter 邏輯生效）。

---

## Task 3：Item Tags（資料模型 + admin 輸入 + 首頁顯示 tags/摘要）

### 目標
每篇 item 可以打上自由文字的 tags；首頁的 item 卡片顯示 tag pills 跟一段摘要文字。

### 資料模型
Item 新增 `tags: string[]`，一樣直接存進 item 的 JSON blob（`items.data`），不需要 D1 migration（同 Task 2 的理由，見 `edge-src/models/FeedDb.js:404-419` 的 `_putItemToContent()`）。

### 步驟

**A. Admin UI（`client-src/ClientAdminItemsApp/components/EditItemApp/index.jsx`）**

1. 新增一個 creatable 版本的 select 元件。最小改法：在 `client-src/components/AdminSelect/index.jsx` 旁邊新增 `client-src/components/AdminCreatableSelect/index.jsx`，把 `import Select from 'react-select'` 換成 `import CreatableSelect from 'react-select/creatable'`（`react-select` 套件已經安裝，`/creatable` 是同套件內建的子模組，不是新依賴），其餘 props/樣式直接複製 `AdminSelect` 的寫法。
2. 在 `EditItemApp` render()（`client-src/ClientAdminItemsApp/components/EditItemApp/index.jsx:238-248` Title 欄位之後）加入：
   ```jsx
   <AdminCreatableSelect
     label="Tags"
     value={(item.tags || []).map((t) => ({label: t, value: t}))}
     options={[]}
     onChange={(selected) => {
       this.onUpdateItemMeta({tags: (selected || []).map((o) => o.value)});
     }}
     extraParams={{isMulti: true}}
   />
   ```
   - v1 **不做自動完成建議**：`options={[]}`。原因：Edit item 頁面目前載入時只抓「這一篇」item 的資料（見 `functions/admin/items/[itemId]/index.jsx:11-16` 的 `feed.getContent({queryKwargs:{id:itemId}, limit:1})`），沒有其他 items 的 tags 可以拿來做建議清單。要做自動完成需要額外一支 API 或修改這支 route 多抓一份「所有 items 的 tags」，這是明顯的額外工程量，先不做，之後有需要再加。
3. `item.tags` 會跟著 `item` state 其他欄位一起在 `onSubmit`（`EditItemApp/index.jsx:152-179`）被整包 POST 出去，不需要改 submit 邏輯。

**B. 公開寫入 API 的欄位映射（`edge-src/models/FeedCrudManager.js`）**

4. 在 `_publicToInternalSchemaForItem()`（`edge-src/models/FeedCrudManager.js:13-95`）加入：
   ```js
   if (Array.isArray(item.tags)) {
     internalSchema.tags = item.tags;
   }
   ```
   （放在 `if (item.image) {...}` 附近即可）這讓外部呼叫 `PUT /api/items/[itemId]` 的人也能寫入 tags，跟其他欄位待遇一致。

**C. 公開讀取 JSON 組裝（`edge-src/models/FeedPublicJsonBuilder.js`）**

5. 在 `_buildPublicContentItem()`（`edge-src/models/FeedPublicJsonBuilder.js:186-281`）加入：
   ```js
   if (Array.isArray(item.tags) && item.tags.length > 0) {
     newItem['tags'] = item.tags;
   }
   ```
6. 摘要文字：`item.descriptionText`（plain text 版描述）已經在 `_decorateForItem()`（`edge-src/models/FeedPublicJsonBuilder.js:25-34`）算好，並在 `_buildPublicContentItem()` 存成 `newItem['content_text']`（第 236 行）。新增一行用既有的 `truncateString`（`common-src/StringUtils.js:215-221`，已經在專案裡，不用新寫截斷邏輯）：
   ```js
   if (item.descriptionText) {
     newItem['excerpt'] = truncateString(item.descriptionText, 120);
   }
   ```
   需要在檔案頂端 import `truncateString`（`FeedPublicJsonBuilder.js` 目前已經有從 `common-src/StringUtils` import `htmlToPlainText` 等函式，加這個到同一行 import 即可）。

**D. 前台顯示（`edge-src/common/default_themes/web_feed.html`）**

7. 在 item-card 迴圈（目前結構大致是 `<a class="item-card">縮圖 + title + meta</a>`）裡加入 tags 跟 excerpt：
   ```html
   {{#items}}
   <a href="{{_microfeed.web_url}}" class="item-card">
     {{#image}}<img src="{{image}}" alt="{{title}}" loading="lazy"/>{{/image}}
     <div>
       <span class="item-title">{{title}}</span>
       <div class="item-meta">
         {{_microfeed.date_published_short}}
         {{#_microfeed.duration_hhmmss}} &middot; <i>{{_microfeed.duration_hhmmss}}</i>{{/_microfeed.duration_hhmmss}}
       </div>
       {{#excerpt}}<p class="item-excerpt">{{excerpt}}</p>{{/excerpt}}
       {{#tags.length}}
       <div class="item-tags">
         {{#tags}}<span class="tag-pill">{{.}}</span>{{/tags}}
       </div>
       {{/tags.length}}
     </div>
   </a>
   {{/items}}
   ```
   - 注意：這裡先用 `<span class="tag-pill">`（不可點擊），因為點擊篩選要整個 `<a>` 換掉外層結構（Task 4 會把 tag 改成 `<a>` 並拿掉外層 item-card 的點擊區域重疊問題，見 Task 4 的說明）。
8. `web_header.html` 新增樣式：
   ```css
   .item-excerpt { font-size: 0.9em; color: var(--muted); margin: 0.4em 0; }
   .item-tags { display: flex; flex-wrap: wrap; gap: 0.4em; margin-top: 0.4em; }
   .tag-pill {
     display: inline-block;
     font-size: 0.75em;
     padding: 0.15em 0.7em;
     border-radius: 999px;
     background: #f1efe9;
     color: var(--muted);
   }
   ```

### 測試驗證
1. 打開任一篇 item 的 Edit 頁，Tags 欄位輸入 `AI`、按 Enter，再輸入 `自媒體`、按 Enter，確認變成兩個 tag chip。存檔後重新整理頁面，確認兩個 tag 還在（代表有正確存到 DB 並讀回來）。
2. 開首頁，確認該篇 item 卡片下方出現 `AI`、`自媒體` 兩個 pill，以及一段從文章內容擷取的摘要文字（沒有 HTML tag、沒有截斷在單字中間亂碼）。
3. 找一篇完全沒填 tags、沒填 description 的 item，確認卡片正常顯示（不會出現空的 tags 區塊或空的 `<p></p>`）。
4. 用 `curl -X PUT` 打 `/api/items/[itemId]/` 帶 `{"tags": ["test-api"]}`（比照現有 public API 的認證方式），確認可以透過公開 API 寫入 tags，且首頁/GET json feed 能讀到。
5. 開 `http://127.0.0.1:8788/json/`，確認回傳的 JSON 裡該 item 有 `tags` 陣列跟 `excerpt` 欄位（用瀏覽器或 `curl | jq` 檢查）。

---

## Task 4：Tag 點擊篩選（v1，不分頁）

### 目標
點擊首頁卡片上的某個 tag pill，導到 `/?tag=xxx`，該頁只列出有這個 tag 的所有 items（不分頁，一次全部列出），並顯示「目前篩選：xxx ✕清除」的提示列。

### 前置依賴
需要 Task 3 完成（items 要先有 tags 資料）。

### 步驟

**A. 抓取全部 items（`functions/index.jsx`）**

1. 目前的 `onRequestGet`：
   ```js
   const webResponseBuilder = new WebResponseBuilder(env, request, {
     queryKwargs: { status: STATUSES.PUBLISHED },
   });
   ```
   改成：
   ```js
   const { searchParams } = new URL(request.url);
   const tag = searchParams.get('tag');
   const webResponseBuilder = new WebResponseBuilder(env, request, {
     queryKwargs: { status: STATUSES.PUBLISHED },
     limit: tag ? -1 : undefined,
   });
   ```
   - `limit: -1` 會讓 `FeedDb.getContent()`（`edge-src/models/FeedDb.js:349-350`）把 limit 設成 `undefined`，也就是不加 SQL `LIMIT`，抓出**全部**符合 status 的 items（而不是只有目前這一頁的 20 篇）。這是必要的，因為 tag 篩選要在 JS 層面對「全部資料」做 filter，不能只篩選已經被分頁截斷過的那一批。
   - **效能提醒（寫在程式註解裡）**：這個做法會把整個 items table 讀進記憶體做 JS filter，對幾百篇文章的個人網站/podcast 沒問題；如果之後文章量到幾千篇以上，會需要改成在 SQL 層面用 SQLite 的 `json_each()` 對 `data` 欄位查詢 tags（D1 底層是 SQLite，支援 JSON1 函式），屆時是另一個工程項目，這次先不做。

2. 在 `getComponent` callback 裡（目前只有 `return <EdgeHomeApp jsonData={jsonData} theme={theme}/>;`）加入篩選邏輯：
   ```js
   getComponent: (content, jsonData, theme) => {
     if (tag) {
       jsonData.items = (jsonData.items || []).filter(
         (item) => Array.isArray(item.tags) && item.tags.includes(tag)
       );
       jsonData._microfeed.current_tag = tag;
       delete jsonData._microfeed.items_next_cursor;
       delete jsonData._microfeed.items_prev_cursor;
       delete jsonData._microfeed.next_url;
       delete jsonData._microfeed.prev_url;
     }
     return <EdgeHomeApp jsonData={jsonData} theme={theme}/>;
   },
   ```
   - 直接在這裡 mutate `jsonData` 是刻意選擇的最簡單做法：`jsonData` 是這次 request 專屬、剛 build 好、還沒被任何地方快取的物件，改了不會影響到 `FeedPublicJsonBuilder`（不需要為了一個「路由層級的篩選」去動資料組裝那層的通用邏輯）。
   - 清掉 `items_next_cursor`/`items_prev_cursor`/`next_url`/`prev_url` 是為了讓 Task 1 的 pagination 按鈕在篩選模式下不會出現（因為 v1 決定不分頁）。

**B. 前台顯示「篩選中」提示列 + tag 變成可點擊連結**

3. `web_feed.html`：
   - Hero 下面、Latest 標題上面加一段（只有篩選時才顯示）：
     ```html
     {{#_microfeed.current_tag}}
     <div class="tag-filter-banner">
       篩選標籤：<strong>{{_microfeed.current_tag}}</strong>
       <a href="/">✕ 清除篩選</a>
     </div>
     {{/_microfeed.current_tag}}
     ```
   - 把 Task 3 的 `<span class="tag-pill">{{.}}</span>` 改成 `<a href="/?tag={{.}}" class="tag-pill">{{.}}</a>`。
   - **重要 UI 細節**：因為整張卡片本身就是一個 `<a class="item-card">`（連到文章頁），tag pill 又是連結，會變成 `<a>` 包 `<a>`，HTML 是不合法的、瀏覽器行為也不可靠（巢狀連結通常只有最外層生效，內層點擊沒反應）。這裡需要把 item-card 的外層標籤從 `<a>` 改成 `<div>`，卡片內的標題文字自己包一個 `<a href="{{_microfeed.web_url}}">` 讓標題可點擊進文章頁，tag 各自是獨立的 `<a>`，兩者不再互相巢狀。連帶要改 `.item-card:hover` 的 CSS（原本靠 `<a>:hover` 的樣式，改成 `.item-card:hover` 對 `<div>` 一樣有效，不受影響）。
4. `web_header.html` 新增：
   ```css
   .tag-filter-banner {
     text-align: center;
     font-size: 0.9em;
     color: var(--muted);
     margin-bottom: 1.5em;
   }
   .tag-filter-banner a { margin-left: 0.6em; }
   .tag-pill:hover { background: var(--accent); color: #fff; }
   ```

**C. RSS/JSON feed 是否也要支援 `?tag=`？**

5. **不在這次範圍內**——`functions/rss/index.jsx`、`functions/json/index.jsx`（如果存在类似路由）維持原樣，只有 `功能/index.jsx`（網頁首頁）支援 tag 篩選。這是刻意縮小範圍：RSS reader 通常不會帶 query string 篩選，且訂閱源篩選是不同的使用情境，等有實際需求再做。

### 測試驗證
1. 先確認至少有 2 篇 item 有共同的 tag（例如都打了 `AI`），另外至少 1 篇沒有這個 tag。
2. 開首頁，點擊某篇卡片上的 `AI` tag pill，確認網址變成 `?tag=AI`，列表只顯示有 `AI` tag 的那幾篇，沒有這個 tag 的文章不出現。
3. 確認篩選中的頁面上方有出現「篩選標籤：AI ✕清除篩選」提示列，點擊「清除篩選」能回到 `/` 顯示全部文章。
4. 確認篩選模式下**沒有** Prev/Next 分頁按鈕（因為 v1 不分頁）。
5. 確認點擊卡片標題文字還是能正常進入文章詳細頁（驗證 Step B.3 拆解 `<a>` 巢狀之後,標題連結沒有失效）。
6. 用瀏覽器 DevTools 檢查該頁面的 HTML，確認沒有 `<a>` 巢狀在 `<a>` 裡面（避免 invalid HTML）。
7. 測試一個不存在的 tag，例如 `/?tag=不存在的標籤`，確認頁面顯示「No items.」而不是報錯或顯示全部文章。
8. （效能檢查，非必要但建議）如果你的測試站台文章數量少，這步可以跳過：如果有上百篇文章，測試篩選頁面的載入時間，確認沒有明顯變慢到無法接受。

---

## 建議實作順序與依賴關係

```
Task 1（Hero）───────────────────────► 獨立，風險最低，可以先做
Task 2（Nav 選單）───────────────────► 獨立於 Task 1/3/4
Task 3（Tags 資料模型 + 顯示）────────► 必須先做，Task 4 依賴它
Task 4（Tag 點擊篩選）───────────────► 依賴 Task 3 完成
```
Task 1 跟 Task 2 互相獨立，可以任意順序或合併一起做。Task 3 必須在 Task 4 之前完成並先驗證資料正確（tags 有存進去、有顯示出來），再做 Task 4 的篩選邏輯，比較好抓 bug（如果篩選結果不對，至少能先排除「資料本身就沒存對」的可能性）。

## 總共會新增/修改的檔案清單

**新增**
- `client-src/ClientAdminChannelApp/components/EditChannelApp/components/NavItemsEditor/index.jsx`
- `client-src/components/AdminCreatableSelect/index.jsx`

**修改**
- `edge-src/common/default_themes/web_header.html`（CSS：hero breakout、nav-links、漢堡選單、tag pill、excerpt、篩選提示列樣式）
- `edge-src/common/default_themes/web_body_start.html`（nav 加 nav_items 迴圈 + 漢堡選單 markup）
- `edge-src/common/default_themes/web_feed.html`（hero 拿掉 h1/subscribe、item-card 加 tags/excerpt、拆解巢狀 `<a>`、篩選提示列）
- `client-src/ClientAdminChannelApp/components/EditChannelApp/index.jsx`（掛載 NavItemsEditor）
- `edge-src/models/FeedPublicJsonBuilder.js`（`_microfeed.nav_items`、item `tags`/`excerpt`）
- `edge-src/models/FeedCrudManager.js`（public API 寫入 tags 的欄位映射）
- `client-src/ClientAdminItemsApp/components/EditItemApp/index.jsx`（Tags 欄位）
- `functions/index.jsx`（讀 `?tag=` query、`limit:-1`、filter jsonData.items）

**不需要**：D1 migration、新增資料庫欄位、新增 API route、新增外部套件依賴。
