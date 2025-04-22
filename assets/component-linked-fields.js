if (!customElements.get("yc-linked-fields")) {
  class LinkedFields extends HTMLElement {
    constructor() {
      super();

      this.locale = document.documentElement.lang || "en";
      this.countryField = this.querySelector('yc-combobox[name="country"]');
      this.regionField = this.querySelector('yc-combobox[name="region"]');
      this.cityField = this.querySelector('yc-combobox[name="city"]');
    }

    get checkedCountry() {
      return document.querySelector("yc-combobox[name='country'] input:checked")?.dataset.country;
    }

    get checkedRegion() {
      return document.querySelector("yc-combobox[name='region'] input:checked")?.dataset.region;
    }
  
    async connectedCallback() {
      if (this.countryField) {
        await this.setupCountries();
      }
    }
  
    setupOptions(newOptions, name) {
      const selector = document.querySelector(`yc-combobox[name=${name}]`);
      const content = selector?.querySelector("yc-combobox-content");
      const isRequired = content.hasAttribute("required");
      const oldOptions = content.querySelectorAll("label");
      const customerLocale = new Intl.Locale(window.Dotshop?.customer_locale);
      const customerCountryCode = customerLocale?.region;

      if (!selector || !content) {
        console.error(`Selector or content not found for ${name}`);
        return;
      };

      if (oldOptions && oldOptions.length > 0) {
        oldOptions.forEach(option => option.remove());
      }
  
      newOptions.forEach((opt, index) => {
        const option = document.createElement("yc-combobox-item");

        option.setAttribute("value", opt.value);
        option.setAttribute(`data-${name}`, opt.code);
        option.textContent = opt.label;

        if (isRequired) {
          option.setAttribute("required", "");
        }

        if ((name === "country") && (customerCountryCode === opt.code)) {
          option.setAttribute("checked", "");
        } else if (index === 0) {
          option.setAttribute("checked", "");
        }
  
        content.appendChild(option);
      });
  
      selector.setup(content.querySelectorAll("yc-combobox-item"), (e) => this.onchange(name, e.target.dataset[name]));
    }
  
    onchange(name, value) {
      if (this.cityField) return;

      if (this.countryField && name === "country") {
        this.setupRegions(value);
      }
      
      if (name === "region") {
        this.setupCities(this.checkedCountry, value);
      }
    }

    async setupCountries() {
      const countriesList = await this.fetchCountries();

      if (!countriesList) {
        console.error("No countries found");
        return;
      }

      this.setupOptions(countriesList, "country");

      const region = document.querySelector('yc-combobox[name="region"]');

      if (region) {
        await this.setupRegions();
      }
    }

    async setupRegions(countryCode) {
      const selectedCountryCode = countryCode || this.checkedCountry;
      const regionsList = await this.fetchRegions(selectedCountryCode);

      if (!regionsList) {
        console.error("No regions found");
        return;
      }

      this.setupOptions(regionsList, "region");

      const city = document.querySelector('yc-combobox[name="city"]');

      if (city) {
        await this.setupCities();
      }
    }

    async setupCities(countryCode, regionCode) {
      const selectedCountryCode = countryCode || this.checkedCountry;
      const selectedRegionCode = regionCode || this.checkedRegion;
      const citiesList = await this.fetchCities(selectedCountryCode, selectedRegionCode);

      if (!citiesList) {
        console.error("No cities found");
        return;
      }

      this.setupOptions(citiesList, "city");
    }

    async fetchCountries() {
      try {
        const response = await youcanjs.misc.getCountries(this.locale);

        if (response && response.countries.length) {
          return response.countries.map((country) => ({
            label: country.name,
            value: country.name,
            code: country.code,
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
            label: region.name,
            value: region.name,
            code: region.code,
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
            label: city,
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
