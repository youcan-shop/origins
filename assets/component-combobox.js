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
      this.setup();
      this.attachListeners();
      this.search && this.enableSearch();
    }

    setup() {
      const items = this.content.querySelectorAll("yc-combobox-item");

      items.forEach((item) => {
        const { value } = item.attributes;
        const label = item.textContent.trim();
        const checked = item.hasAttribute("checked");
        const disabled = item.hasAttribute("disabled");
        const required = item.hasAttribute("required");

        if (checked) this.placeholder.textContent = label;

        item.outerHTML = `
          <label role="option">
            <span>${label}</span>
            <input type="radio" name="${this.getAttribute("name")}" value="${value?.value}" 
              ${disabled ? "disabled" : ""} ${checked ? "checked" : ""} ${required ? "required" : ""} hidden>
          </label>`;
      });
    }

    attachListeners() {
      if (this.listenersAttached) return;

      this.listenersAttached = true;
      this.onSelect();
      this.onTrigger();
      this.onClickOutSide();
    }

    enableSearch() {
      const placeholder = this.search.getAttribute("placeholder");
      const noResultsMsg = this.search.getAttribute("no-results");
      const searchInput = document.createElement("input");
      searchInput.type = "search";
      searchInput.name = "search";
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

    onSelect() {
      const options = this.content.querySelectorAll("label");

      options.forEach((opt) =>
        opt.addEventListener("change", () => {
          this.placeholder.textContent = opt.textContent.trim();
          this.toggleState(false);
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
          const isMatch = opt.textContent.toLowerCase().includes(query);
          opt.hidden = !isMatch;
          hasMatch ||= isMatch;
        });

        this.content.dataset.noResults = hasMatch ? "" : no_results_message;
      });
    }
  }
  class LinkedFields extends Combobox {
    constructor() {
      super();

      this.countryField = null;
      this.regionField = null;
      this.cityField = null;
      this.locale = document.documentElement.lang || "en";
    }

    async connectedCallback() {
      await this.setupLinkedFields();
    }

    async setupLinkedFields() {
      this.countryField = document.querySelector('yc-linked-fields[data-field="country"]');
      this.regionField = document.querySelector('yc-linked-fields[data-field="region"]');
      this.cityField = document.querySelector('yc-linked-fields[data-field="city"]');

      if (this.countryField && this.regionField) {
        await this.setupCountryField();
      }

      if (this.countryField && this.regionField) {
        await this.setupRegionField();
      }

      if (this.countryField && this.regionField && this.cityField) {
        await this.setupCityField();
      }
    }

    async setupCountryField() {
      const countries = await this.fetchCountries();

      this.updateComboboxOptions(this.countryField, countries);
      this.countryField.addEventListener("change", async (e) => {
        const selectedCountry = e.target.value;
        const regions = await this.fetchRegions(selectedCountry);

        this.updateComboboxOptions(this.regionField, regions);
      });
    }

    async setupRegionField() {
      const countryInput = this.countryField.querySelector("input:checked");
      const countryCode = countryInput ? countryInput.value : "";
      const regions = await this.fetchRegions(countryCode);

      this.updateComboboxOptions(this.regionField, regions);
      this.regionField.addEventListener("change", async (e) => {
        if (this.cityField) {
          const selectedRegion = e.target.value;
          const countryInput = this.countryField.querySelector("input:checked");
          const countryCode = countryInput ? countryInput.value : "";
          const cities = await this.fetchCities(countryCode, selectedRegion);

          this.updateComboboxOptions(this.cityField, cities);
        }
      });
    }

    async setupCityField() {
      const countryInput = this.countryField.querySelector("input:checked");
      const regionInput = this.regionField.querySelector("input:checked");
      const countryCode = countryInput ? countryInput.value : "";
      const regionCode = regionInput ? regionInput.value : "";
      const cities = await this.fetchCities(countryCode, regionCode);

      this.updateComboboxOptions(this.cityField, cities);
    }

    async fetchCountries() {
      try {
        const response = await youcanjs.misc.getCountries(this.locale);

        if (response && response.countries.length) {
          return response.countries.map((country) => ({
            name: country.name,
            value: country.code,
          }));
        }
        return [];
      } catch (error) {
        console.error("Error fetching countries:", error);
        return [];
      }
    }

    async fetchRegions(countryCode) {
      if (!countryCode) return [];

      try {
        const response = await youcanjs.misc.getCountryRegions(countryCode, this.locale);

        if (response && response.states.length) {
          return response.states.map((region) => ({
            name: region.name,
            value: region.code,
          }));
        }
        return [];
      } catch (error) {
        console.error("Error fetching regions:", error);
        return [];
      }
    }

    async fetchCities(countryCode, regionCode) {
      if (!countryCode || !regionCode) return [];

      try {
        const response = await youcanjs.misc.getCountryCities(countryCode, regionCode, this.locale);

        if (response && response.cities.length) {
          return response.cities.map((city) => ({
            name: city,
            value: city,
          }));
        }
        return [];
      } catch (error) {
        console.error("Error fetching cities:", error);
        return [];
      }
    }

    initializeListeners(combobox) {
      combobox.attachListeners();
    }

    async updateComboboxOptions(combobox, options) {
      if (!combobox) return;

      const contentEl = combobox.querySelector("yc-combobox-content");
      const isRequired = contentEl.hasAttribute("required");
      contentEl.innerHTML = "";

      if (options.length === 0) {
        this.resetCombobox(combobox);
        return;
      }

      options.forEach((option, index) => {
        const item = document.createElement("yc-combobox-item");
        item.setAttribute("value", option.value);
        if (isRequired) {
          item.setAttribute("required", "");
        }

        if (index === 0) {
          item.setAttribute("checked", "");
        }
        item.textContent = option.name;
        contentEl.appendChild(item);
      });

      combobox.setup();
      this.initializeListeners(combobox);
      combobox.onSelect();
    }

    resetCombobox(combobox) {
      if (!combobox) return;

      const valueEl = combobox.querySelector("yc-combobox-value");
      if (valueEl) {
        valueEl.textContent = combobox.getAttribute("placeholder") || "Select";
      }
    }
  }

  customElements.define("yc-combobox", Combobox);
  customElements.define("yc-linked-fields", LinkedFields);
}
