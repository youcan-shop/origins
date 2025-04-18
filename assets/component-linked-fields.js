if (!customElements.get("yc-linked-fields")) {
  class LinkedFields extends HTMLElement {
    constructor() {
      super();
      this.trigger = this.querySelector("yc-combobox-trigger");
      this.placeholder = this.trigger?.querySelector("yc-combobox-value");
      this.content = this.querySelector("yc-combobox-content");
      this.search = this.querySelector("yc-combobox-search");
      this.locale = document.documentElement.lang || "en";
      this.fieldType = this.getAttribute("data-field");
      this._onRegionChange = null;
      this.onRegionChangeCallCount = 0;
      this._onCountryChange = null;
      this.onCountryChangeCallCount = 0;
    }

    connectedCallback() {
      if (this.fieldType === "country") {
        this.setupAllField();
      }
    }

    async setupAllField() {
      const countryField = document.querySelector('[data-field="country"]');
      const regionField = document.querySelector('[data-field="region"]');
      const cityField = document.querySelector('[data-field="city"]');

      await this.updateCountries(countryField, regionField);

      const selectedCountry = this.getSelectedValue(countryField);
      
      if (regionField && selectedCountry) { 
        await this.updateRegions(regionField, selectedCountry);
      }

      const selectedRegion = this.getSelectedValue(regionField);

      if (cityField && selectedCountry && selectedRegion) { 
        await this.updateCities(cityField, selectedCountry, selectedRegion);
      }
    }

    async updateCountries(countryField, regionField) {
      const countries = await this.fetchCountries();
      console.log('update country in progress');
    
      this.updateOptions(countryField, countries);
      
      this._onCountryChange = (e) => this.onRegionChange(e, regionField);
      countryField.addEventListener("change", this._onCountryChange);
    }

    async onCountryChange(e, regionField) {
      this.onCountryChangeCallCount++;

      console.log(`[CHANGE COUNTRY HANDLER] Called ${this.onRegionChangeCallCount} times`);
      const countryCode = e.detail?.value || e.target.value;

      if (regionField) {
        await this.updateRegions(regionField, countryCode);
      }
    };

    async updateRegions(regionField, countryCode) {
      const regions = await this.fetchRegions(countryCode);
      console.log('update region in progress', regionField, countryCode, regions);
      
      if(regions) {
        this.updateOptions(regionField, regions);
      }
    
      if (this._onRegionChange) {
        regionField.removeEventListener("change", this._onRegionChange);
      } 
        
      this._onRegionChange = (e) => this.onRegionChange(e, countryCode);
      regionField.addEventListener("change", this._onRegionChange);
    }

    async onRegionChange(e, countryCode) {
      this.onRegionChangeCallCount++;
      console.log(`[CHANGE REGION HANDLER] Called ${this.onRegionChangeCallCount} times`);
      const regionCode = e.detail?.value || e.target.value;
      const cityField = document.querySelector('[data-field="city"]');

      if (cityField) {
        await this.updateCities(cityField, countryCode, regionCode);
      }
    };

    async updateCities(cityField, countryCode, regionCode) {
      const cities = await this.fetchCities(countryCode, regionCode);
      console.log('update city in progress', countryCode, regionCode, cities);
      
      if(cities) {
        this.updateOptions(cityField, cities);
      }
    }

    getSelectedValue(field) {
      if (!field || !field.content) return;
      console.log('the selected field', field);

      const input = field.querySelector("input:checked");
      console.log('the selected checked input', input);
      return input ? input.value : "";
    }

    updateOptions(field, options) {
      console.log('going inside updateOption()');

      if (!field || !field.content) {
        console.error("Missing field or field.content", field);
        return;
      }

      console.log(field.content);
      const isRequired = field.content.hasAttribute("required");
      field.content.innerHTML = "";

      if (options.length === 0) {
        console.log("input field is 0");
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
        field.content.appendChild(item);
      });

      this.setupField(field);
    }

    setupField(field) {
      console.log("going through the setupFieldd()");
      const items = field.content.querySelectorAll("yc-combobox-item");
      console.log("get items", items);

      items.forEach((item) => {
        const { value } = item.attributes;
        const label = item.textContent.trim();
        const checked = item.hasAttribute("checked");
        const required = item.hasAttribute("required");

        if (checked && field.placeholder) {
          console.log("replacing the place holder");
          field.placeholder.textContent = label;
        }

        item.outerHTML = `
          <label role="option">
            <span>${label}</span>
            <input type="radio" name="${field.getAttribute("name")}" value="${value?.value}" 
              ${checked ? "checked" : ""} ${required ? "required" : ""} hidden>
          </label>`;

          console.log("dom modifier succecsfully");
      });

      this.attachListeners(field);

      if (field.search) {
        this.enableSearch(field);
      }
    }

    attachListeners(field) {
      console.log('attaching listners', field);
      const updatePlaceholder = (input) => {
        if (field.placeholder) {
          field.placeholder.textContent = input.closest("label").textContent.trim();
        }
        field.content.dataset.visible = false;
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
      console.log('start looking to enable search');
      if (!field.search || field.searchEnabled) return;
      field.searchEnabled = true;
      console.log('enabling search in progress...');

      const placeholder = field.search.getAttribute("placeholder");
      const noResultsMsg = field.search.dataset.noResults;
      const searchInput = document.createElement("input");
      searchInput.type = "search";
      searchInput.name = "search";
      searchInput.placeholder = placeholder;
      searchInput.dataset.noResults = noResultsMsg;

      field.content.insertBefore(searchInput, field.content.firstChild);
      console.log("search is enabled", field.content.insertBefore(searchInput, field.content.firstChild));
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
