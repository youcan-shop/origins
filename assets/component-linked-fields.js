class LinkedFields extends HTMLElement {
  static TYPES = ["country", "region", "city"];

  constructor() {
    super();
    this.locale = document.documentElement.lang || "en";
    this.countryCode = CUSTOMER_COUNTRY_CODE;
    this.regionCode = null;

    for (const name of LinkedFields.TYPES) {
      this[name] = this.querySelector(`yc-combobox[name='${name}']`);
    }
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.fetchOptions();
  }

  async fetchOptions() {
    for (const type of LinkedFields.TYPES) {
      this[type] && (await this.onFetch(type));
    }
  }

  setupOptions(type, options) {
    const combobox = this[type];
    const content = combobox.querySelector("yc-combobox-content");
    const search = combobox.querySelector("input[type='search'");

    content.innerHTML = "";
    content.appendChild(search);

    options.forEach((opt, index) => {
      const isDefault = {
        country: opt.code == this.countryCode,
        region: index === 0,
        city: index === 0,
      };
      const label = typeof opt === "string" ? opt : opt.name;
      const value = typeof opt === "string" ? opt : opt.code;

      content.insertAdjacentHTML(
        "beforeend",
        `<yc-combobox-item value="${label}" data-value="${value}" ${isDefault[type] ? "checked" : ""}>
            ${label}
        </yc-combobox-item>`,
      );
    });

    combobox.setup(content.querySelectorAll("yc-combobox-item"), (e) => this.onChange(e, type));
  }

  async onChange(e, type) {
    const value = e.target.dataset.value;

    if (type === "country") this.countryCode = value;
    if (type === "region") this.regionCode = value;
    for (const next of { country: LinkedFields.TYPES.slice(1), region: LinkedFields.TYPES.slice(2) }[type] || []) {
      this[next] && (await this.onFetch(next));
    }
  }

  async onFetch(type) {
    const fetchMap = {
      country: () => youcanjs.misc.getCountries(this.locale),
      region: () => youcanjs.misc.getCountryRegions(this.countryCode, this.locale),
      city: () => youcanjs.misc.getCountryCities(this.countryCode, this.regionCode, this.locale),
    };

    this.setIsLoading(type, true);

    try {
      const response = await fetchMap[type]?.();
      if (!response) throw new Error(`Unknown fetch type: ${type}`);

      const map = {
        country: () => this.setupOptions(type, response.countries),
        region: () => {
          this.regionCode = response.states[0].code;
          this.setupOptions(type, response.states);
        },
        city: () => this.setupOptions(type, response.cities),
      };

      map[type]?.();
    } catch (error) {
      console.error(error);
    } finally {
      this.setIsLoading(type, false);
    }
  }

  setIsLoading(type, is_loading) {
    const trigger = this[type].querySelector("yc-combobox-trigger");
    trigger.setAttribute("aria-disabled", is_loading);
  }
}

customElements.define("yc-linked-fields", LinkedFields);
