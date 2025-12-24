if (!customElements.get("yc-phone-validation")) {
  class PhoneValidation extends HTMLElement {
    static DEFAULT_COUNTRY_CODE = "MA";
    static CUSTOMER_COUNTRY_CODE = CUSTOMER_COUNTRY_CODE || PhoneValidation.DEFAULT_COUNTRY_CODE;
    
    constructor() {
      super();

      this.phoneCombobox = this.querySelector("[data-combobox-country-code]");
      this.phoneNumber = this.querySelector("[data-phone-number]");
      this.phoneHiddenInput = this.querySelector("[data-phone-hidden-input]");
      this.phoneErrorElement = this.querySelector("[data-phone-error]");
    }

    async connectedCallback() {
      if (!this.validateElements()) return;

      await this.buildCountryCodeOptions();
      this.attachListeners();
    }

    validateElements() {
      return (
        this.phoneCombobox &&
        this.phoneNumber &&
        this.phoneHiddenInput
      );
    }

    async buildCountryCodeOptions() {
      try {
        const { countries } = await window.storeMarketCountries;
        if (!countries || !countries.length) return;

        const content = this.phoneCombobox.querySelector("yc-combobox-content");
        const isRtl = document.documentElement.dir === "rtl";

        countries.forEach((country) => {
          const label = isRtl
            ? `${country.name} (${country.phone}+)`
            : `${country.name} (+${country.phone})`;
            
          const isSelected = country.code === PhoneValidation.CUSTOMER_COUNTRY_CODE;
          
          content.insertAdjacentHTML(
            "beforeend",
            `<yc-combobox-item value="${country.phone}" data-value="${country.code}" ${isSelected ? "checked" : ""}>
              ${label}
            </yc-combobox-item>`
          );
        });

        this.phoneCombobox.setup(content.querySelectorAll("yc-combobox-item"));
      } catch (e) {
        console.error("Failed to populate countries", e);
      }
    }

    getFullPhoneNumber() {
      const selectedInput = this.phoneCombobox.querySelector('input[type="radio"]:checked');
      const countryCode = selectedInput ? selectedInput.value : "";
      const nationalNumber = this.phoneNumber.value.trim();

      if (!nationalNumber || !countryCode) return "";

      return `+${countryCode}${nationalNumber}`;
    }

    toggleError(show) {
      if (this.phoneErrorElement) {
        this.phoneErrorElement.style.display = show ? "block" : "none";
      }
    }

    updatePhoneField() {
      const fullNumber = this.getFullPhoneNumber();

      if (!fullNumber) {
        this.phoneHiddenInput.value = "";
        return;
      }

      try {
        const parsed = libphonenumber.parsePhoneNumber(fullNumber);
        if (parsed && parsed.isValid()) {
          this.phoneHiddenInput.value = parsed.number;
          this.toggleError(false);
        } else {
          this.phoneHiddenInput.value = "";
          this.toggleError(true);
        }
      } catch (e) {
        this.phoneHiddenInput.value = "";
        this.toggleError(true);
      }
    }

    syncCountryCodeFromInput() {
      const inputValue = this.phoneNumber.value.trim();
      if (!inputValue.startsWith("+")) return;

      try {
        const parsed = libphonenumber.parsePhoneNumberFromString(inputValue);
        if (parsed) {
          this.phoneNumber.value = parsed.nationalNumber;
          
          const matchingInput = Array.from(this.phoneCombobox.querySelectorAll('input[type="radio"]'))
            .find(input => input.value === parsed.countryCallingCode);

          if (matchingInput) {
            matchingInput.checked = true;
            
            const label = matchingInput.closest("label");
            if (label) {
                const placeholder = this.phoneCombobox.querySelector("yc-combobox-value");
                if (placeholder) placeholder.textContent = label.textContent.trim();
            }
          }
        }
      } catch (e) {
        // Ignore parsing errors during typing
      }
    }

    attachListeners() {
      this.phoneNumber.addEventListener("input", () => {
        this.toggleError(false);
        this.syncCountryCodeFromInput();
      });

      this.phoneNumber.addEventListener("blur", () => this.updatePhoneField());
    }
  }

  customElements.define("yc-phone-validation", PhoneValidation);
}
