if (!customElements.get("yc-combobox")) {
  class Combobox extends HTMLElement {
    static observedAttributes = ["name"];

    constructor() {
      super();
      this.state = false;
      this.trigger = this.querySelector("yc-combobox-trigger");
      this.placeholder = this.trigger.querySelector("yc-combobox-value");
      this.content = this.querySelector("yc-combobox-content");
      this.search = this.querySelector("yc-combobox-search");
    }

    connectedCallback() {
      const items = this.content.querySelectorAll("yc-combobox-item");

      this.setup(items);
      this.attachListeners();
    }

    setup(items, callback) {
      items.forEach((item) => {
        const { value, en, fr, ar } = item.attributes;
        const label = item.textContent.trim();
        const content = item.innerHTML.trim();
        const checked = item.hasAttribute("checked");
        const disabled = item.hasAttribute("disabled");
        const required = item.hasAttribute("required");
        const translation = Boolean(en && en.value) ? [`data-en="${en.value}"`, `data-fr="${fr.value}"`, `data-ar="${ar.value}"`].join(" ") : "";

        if (checked) this.placeholder.innerHTML = content;

        item.outerHTML = `
          <label role="option" title="${label}">
            <span>${content}</span>
            <input type="radio" name="${this.getAttribute("name")}" value="${value?.value}" data-value="${item.attributes["data-value"]?.value ?? ""}"
              ${translation} ${disabled ? "disabled" : ""} ${checked ? "checked" : ""} ${required ? "required" : ""} hidden >
          </label>`;
      });

      this.onSelect(callback);
      this.search && this.enableSearch();
    }

    attachListeners() {
      this.onTrigger();
      this.onClickOutSide();
    }

    enableSearch() {
      const placeholder = this.search.getAttribute("placeholder") || window.combobox.search;
      const noResultsMsg = this.search.getAttribute("no-results") || window.combobox.no_results;
      const searchInput = document.createElement("input");
      searchInput.type = "search";
      searchInput.placeholder = placeholder;

      this.search.replaceWith(searchInput);
      this.search = searchInput;

      const options = [...this.content.querySelectorAll("label")];
      this.onSearch(options, noResultsMsg);
    }

    toggleState(visible) {
      this.state = visible;
      this.content.dataset.visible = visible;
    }

    onSelect(callback) {
      const options = this.content.querySelectorAll("label");

      options.forEach((opt) =>
        opt.addEventListener("change", (e) => {
          this.placeholder.textContent = opt.textContent.trim();
          this.toggleState(false);
          callback && callback.call(this, e);
        }),
      );
    }

    onTrigger() {
      this.trigger.addEventListener("click", () => {
        this.content.toggleAttribute("is-above", innerHeight - this.trigger.getBoundingClientRect().bottom < this.content.offsetHeight);
        this.toggleState(!this.state);
      });
    }

    onClickOutSide() {
      document.addEventListener("click", (e) => {
        const isTrigger = e.composedPath().includes(this.trigger);
        const isSearch = e.target.tagName === "INPUT";

        if (!isTrigger && !isSearch) this.toggleState(false);
      });
    }

    onSearch(options, no_results_message) {
      this.search.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        let hasMatch = false;

        options.forEach((opt) => {
          const { en, fr, ar } = opt.querySelector("input").dataset;

          const isMatch = !en ? opt.textContent.toLowerCase().includes(query) : [en, fr, ar].some((trans) => trans.toLowerCase().includes(query));
          opt.hidden = !isMatch;
          hasMatch ||= isMatch;
        });

        this.content.dataset.noResults = hasMatch ? "" : no_results_message;
      });
    }
  }

  customElements.define("yc-combobox", Combobox);
}
