if (!customElements.get("yc-linked-fields")) {
  class LinkedFields extends HTMLElement {
    constructor() {
      super();
      this.locale = document.documentElement.lang || "en";
      this.fieldType = this.getAttribute("data-field");
      this.trigger = this.querySelector("yc-combobox-trigger");
      this.placeholder = this.trigger?.querySelector("yc-combobox-value");
      this.content = this.querySelector("yc-combobox-content");
      this.search = this.querySelector("yc-combobox-search");

      if (!this.constructor.fields) {
        this.constructor.fields = {
          country: null,
          region: null,
          city: null,
        };
      }
    }

    connectedCallback() {
      this.constructor.fields[this.fieldType] = this;

      if (this.fieldType === "country") {
        this.setupAllFields();
      }
    }

    async setupAllFields() {
      const { country } = this.constructor.fields;
      if (!country) return;

      const countries = await this.fetchCountries();
      this.updateOptions(country, countries);
      let countryCode = '';

      country.addEventListener("change", async (e) => {
        countryCode = e.detail?.value || e.target.value;

        await this.updateRegions(countryCode);
      });

      countryCode = this.getSelectedValue(country);
      await this.updateRegions(countryCode);
      this.setupRegionListeners();
    }
    
    setupRegionListeners() {
      const { country, region, city } = this.constructor.fields;
  
      if (region && city) {
        region.addEventListener("change", async (e) => {
          const regionCode = e.detail?.value || e.target.value;
          const countryCode = this.getSelectedValue(country);

          await this.updateCities(countryCode, regionCode);
        });
      }
    }

    async updateRegions(countryCode) {
      const { region, city } = this.constructor.fields;

      if (!region) return;

      const regions = await this.fetchRegions(countryCode);

      this.updateOptions(region, regions);

      if (city) {
        const regionCode = this.getSelectedValue(region);

        await this.updateCities(countryCode, regionCode);
      }
    }

    async updateCities(countryCode, regionCode) {
      const { city } = this.constructor.fields;

      const cities = await this.fetchCities(countryCode, regionCode);
      this.updateOptions(city, cities);
    }

    getSelectedValue(field) {
      if (!field || !field.content) return;

      const input = field.querySelector("input:checked");
      return input ? input.value : "";
    }

    updateOptions(field, options) {
      if (!field || !field.content) return;

      const content = field.content;
      const isRequired = content.hasAttribute("required");
      const searchInput = content.querySelector('input[type="search"]');
      content.innerHTML = "";
      
      if (searchInput) {
        content.appendChild(searchInput);
      }

      if (options.length === 0) {
        this.resetField(field);
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
        content.appendChild(item);
      });

      this.setupField(field);
    }

    setupField(field) {
      const items = field.content.querySelectorAll("yc-combobox-item");

      items.forEach((item) => {
        const { value } = item.attributes;
        const label = item.textContent.trim();
        const checked = item.hasAttribute("checked");
        const disabled = item.hasAttribute("disabled");
        const required = item.hasAttribute("required");

        if (checked && field.placeholder) {
          field.placeholder.textContent = label;
        }

        item.outerHTML = `
          <label role="option">
            <span>${label}</span>
            <input type="radio" name="${field.getAttribute("name")}" value="${value?.value}" 
              ${disabled ? "disabled" : ""} ${checked ? "checked" : ""} ${required ? "required" : ""} hidden>
          </label>`;
      });

      this.attachListeners(field);

      if (field.search) {
        this.enableSearch(field);
      }
    }

    attachListeners(field) {
      if (field.listenersAttached) return;
      field.listenersAttached = true;

      const updatePlaceholder = (input) => {
      if (field.placeholder) {
        field.placeholder.textContent = input.closest("label").textContent.trim();
      }
      field.content.dataset.visible = false;
      field.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { value: input.value } }));
      };

      field.content.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => updatePlaceholder(input));
      });

      field.trigger?.addEventListener("click", () => {
      field.content.dataset.visible = field.content.dataset.visible !== "true";
      });

      document.addEventListener("click", (e) => {
      if (!field.contains(e.target)) {
        field.content.dataset.visible = false;
      }
      });
    }

    enableSearch(field) {
      if (!field.search || field.searchEnabled) return;
      field.searchEnabled = true;

      const placeholder = field.search.getAttribute("placeholder");
      const noResultsMsg = field.search.dataset.noResults;
      const searchInput = document.createElement("input");
      searchInput.type = "search";
      searchInput.name = "search";
      searchInput.placeholder = placeholder;
      searchInput.dataset.noResults = noResultsMsg;

      field.content.insertBefore(searchInput, field.content.firstChild);
      this.setupSearchFunctionality(field, searchInput, noResultsMsg);
    }

    setupSearchFunctionality(field, searchInput, noResultsMsg) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        let hasMatch = false;

        const options = [...field.content.querySelectorAll("label")];
        options.forEach((opt) => {
          const isMatch = opt.textContent.toLowerCase().includes(query);
          opt.hidden = !isMatch;
          hasMatch = hasMatch || isMatch;
        });

        field.content.dataset.noResults = hasMatch ? "" : noResultsMsg;
      });
    }

    resetField(field) {
      if (!field || !field.placeholder) return;
      
      field.placeholder.textContent = "Select";
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
  }

  customElements.define("yc-linked-fields", LinkedFields);
}
