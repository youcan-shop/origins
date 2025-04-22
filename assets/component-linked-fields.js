if (!window.LocationFieldBase) {
  window.LocationFieldBase = class LocationFieldBase extends HTMLElement {
    constructor() {
      super();

      this.locale = document.documentElement.lang || "en";
      this.productForm = this.closest("yc-product-form");
    }

    populateField(items, fieldName, extraAttributes = {}, callback) {
      const comboBox = this.querySelector(`yc-combobox[name=${fieldName}]`);
      const comboBoxContent = comboBox.querySelector("yc-combobox-content");

      const fragment = document.createDocumentFragment();

      if (fieldName !== "country" && comboBoxContent.children.length > 0) {
        comboBoxContent.replaceChildren(comboBoxContent.children[0]);
      }

      items.forEach((item, index) => {
        const option = document.createElement("yc-combobox-item");

        option.setAttribute("value", item.value);

        if (item.code) {
          option.setAttribute(`data-${fieldName}-code`, item.code);
        }

        for (const [key, value] of Object.entries(extraAttributes)) {
          if (!!value) {
            option.setAttribute(`data-${key}`, value);
          }
        }

        option.toggleAttribute("required", comboBoxContent.hasAttribute("required"));
        option.toggleAttribute("checked", index === 0);

        option.textContent = item.label;

        fragment.appendChild(option);
      });

      comboBoxContent.append(fragment);

      comboBox.setUp(comboBoxContent.querySelectorAll("yc-combobox-item"), callback);
    }

    handleAPIError(error, message) {
      console.error(message, error);
      toast.show(error.message, "error");

      return [];
    }
  };
}

if (!customElements.get("yc-country-field")) {
  class CountryField extends window.LocationFieldBase {
    connectedCallback() {
      this.listCountries();
    }

    async listCountries() {
      const countries = await this.fetchCountries();

      this.populateField(countries, "country", {}, (e) => {
        this.dispatch(e.target.dataset.countryCode);
      });

      if (countries.length > 0) {
        this.dispatch(countries[0].code);
      }
    }

    populateField(countries, fieldName, extraAttributes, callback) {
      return super.populateField(countries, fieldName, extraAttributes, callback);
    }

    dispatch(countryCode) {
      const changeEvent = new CustomEvent("country-field:change", {
        detail: { countryCode },
      });

      this.productForm.dispatchEvent(changeEvent);
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
        return this.handleAPIError(error, "Error fetching countries:");
      }
    }
  }

  customElements.define("yc-country-field", CountryField);
}

if (!customElements.get("yc-region-field")) {
  class RegionField extends window.LocationFieldBase {
    connectedCallback() {
      this.productForm.addEventListener("country-field:change", async (e) => {
        await this.listRegions(e.detail.countryCode);
      });
    }

    async listRegions(countryCode) {
      const regions = await this.fetchRegions(countryCode);

      this.populateField(regions, "region", { "country-code": countryCode }, (e) => {
        const { regionCode, countryCode } = e.target.dataset;
        this.dispatch(regionCode, countryCode);
      });

      if (regions.length > 0) {
        this.dispatch(regions[0].code, countryCode);
      }
    }

    populateField(regions, fieldName, extraAttributes, callback) {
      return super.populateField(regions, fieldName, extraAttributes, callback);
    }

    dispatch(regionCode, countryCode) {
      const changeEvent = new CustomEvent("region-field:change", {
        detail: { regionCode, countryCode },
      });

      this.productForm.dispatchEvent(changeEvent);
    }

    async fetchRegions(countryCode) {
      if (!countryCode) return [];

      try {
        const response = await youcanjs.misc.getCountryRegions(countryCode);

        if (response && response.states.length) {
          return response.states.map((region) => ({
            label: region.name,
            value: region.name,
            code: region.code,
          }));
        }
        return [];
      } catch (error) {
        return this.handleAPIError(error, "Error fetching regions:");
      }
    }
  }

  customElements.define("yc-region-field", RegionField);
}

if (!customElements.get("yc-city-field")) {
  class CityField extends window.LocationFieldBase {
    connectedCallback() {
      this.productForm.addEventListener("region-field:change", async (e) => {
        await this.listCities(e.detail.regionCode, e.detail.countryCode);
      });
    }

    async listCities(regionCode, countryCode) {
      const cities = await this.fetchCities(regionCode, countryCode);

      this.populateField(cities, "city", { "country-code": countryCode });
    }

    populateField(cities, fieldName, extraAttributes, callback) {
      return super.populateField(cities, fieldName, extraAttributes, callback);
    }

    onChange(regionCode, countryCode) {
      const changeEvent = new CustomEvent("region-field:change", {
        detail: { regionCode, countryCode },
      });

      this.productForm.dispatchEvent(changeEvent);
    }

    async fetchCities(regionCode, countryCode) {
      if (!regionCode) return [];

      try {
        const response = await youcanjs.misc.getCountryCities(countryCode, regionCode);

        if (response && response.cities.length) {
          return response.cities.map((city) => ({
            label: city,
            value: city,
          }));
        }

        return [];
      } catch (error) {
        return this.handleAPIError(error, "Error fetching cities:");
      }
    }
  }

  customElements.define("yc-city-field", CityField);
}
