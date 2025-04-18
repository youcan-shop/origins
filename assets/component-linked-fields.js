if (!customElements.get("yc-linked-fields")) {
  class LinkedFields extends HTMLElement {
    constructor() {
      super();

      this.locale = document.documentElement.lang || "en";
    }
  
    async connectedCallback() {
      await this.setupCountries();
    }
  
    setupOptions(options, name) {
      const selector = this.querySelector(`yc-combobox[name=${name}]`);
      const content = selector?.querySelector("yc-combobox-content");
  
      options.forEach((opt) => {
        const option = document.createElement("yc-combobox-item");
        option.setAttribute("value", opt.value);
        option.textContent = opt.label;
  
        content?.appendChild(option);
      });
  
      selector?.setup(content.querySelectorAll("yc-combobox-item"), (e) => this.onchange(name, e.target.value));
    }
  
    onchange(name, value) {
      console.log(`NAME: ${name}`);
      console.log(`VALUE: ${value}`);

      if (name === "country") {
        this.setupRegions(value);
      }
      
      if (name === "region") {
        const countryInput = this.querySelector("yc-combobox[name=country] input:checked");
        const countryCode = countryInput ? countryInput.value : null;

        this.setupCities(countryCode, value);
      }
    }

    async setupCountries() {
      const countriesList = await this.fetchCountries();

      if(!countriesList || !countriesList.length) {
        console.error("No countries found");
        return;
      }

      this.setupOptions(countriesList, "country");
    }

    async setupRegions(countryCode) {
      const regionsList = await this.fetchRegions(countryCode);

      if(!regionsList || !regionsList.length) {
        console.error("No regions found");
        return;
      }

      this.setupOptions(regionsList, "region");
    }

    async setupCities(countryCode, regionCode) {
      const citiesList = await this.fetchCities(countryCode, regionCode);

      if(!citiesList || !citiesList.length) {
        console.error("No cities found");
        return;
      }

      this.setupOptions(citiesList, "cities");
    }

    async fetchCountries() {
      try {
        const response = await youcanjs.misc.getCountries(this.locale);

        if (response && response.countries.length) {
          return response.countries.map((country) => ({
            label: country.name,
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
            label: region.name,
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
