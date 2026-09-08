"use client";
import { matchesCountrySearch } from "@/lib/geo/countrySearch";

import { ChevronDown, Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { getKnownCountries, type CountryInfo } from "@/lib/geo";
import type { TerraMode } from "@/lib/modes/types";

type DrawerFilterPanelProps = {
  activeMode: TerraMode;
  selectedCountry: CountryInfo | null;
  sortId: string;
  query?: string;
  onCountryFilterChange: (country: CountryInfo | null) => void;
  onClearCountrySelection: () => void;
  onSortChange: (sortId: string) => void;
};

export function DrawerFilterPanel({
  activeMode,
  selectedCountry,
  sortId,
  query = "",
  onCountryFilterChange,
  onClearCountrySelection,
  onSortChange
}: DrawerFilterPanelProps) {
  const countries = useMemo(getKnownCountries, []);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const countryMenuId = useId();
  const sortMenuId = useId();
  const sortOptions = activeMode.sortOptions.filter((option) => {
    if (option.id === activeMode.recommendations?.sortId) return !query.trim() && !selectedCountry;
    if (option.id === activeMode.searchSortId) return Boolean(query.trim());
    return true;
  });
  const selectedSort = activeMode.sortOptions.find((option) => option.id === sortId) ?? activeMode.sortOptions[0];
  const filteredCountries = useMemo(() => {
    const terms = countryQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);

    if (terms.length === 0) {
      return countries;
    }

    return countries.filter((country) => matchesCountrySearch(country.code, countryQuery));
  }, [countries, countryQuery]);

  function selectCountry(country: CountryInfo | null) {
    onCountryFilterChange(country);
    setCountryMenuOpen(false);
  }

  function selectSort(nextSortId: string) {
    onSortChange(nextSortId);
    setSortMenuOpen(false);
  }

  return (
    <div className="filter-panel" aria-label="Station filters">
      <div className="filter-grid">
        <div
          className="filter-menu-field"
          onBlur={(event) => {
            const nextTarget = event.relatedTarget;

            if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
              setCountryMenuOpen(false);
            }
          }}
        >
          <span className="filter-label">Country</span>
          <button
            aria-controls={countryMenuId}
            aria-expanded={countryMenuOpen}
            className="filter-menu-trigger"
            type="button"
            onClick={() => setCountryMenuOpen((open) => !open)}
          >
            <span>{selectedCountry?.name ?? "All countries"}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {countryMenuOpen ? (
            <div className="filter-menu country-menu" id={countryMenuId}>
              <div className="filter-menu-search">
                <Search size={14} aria-hidden="true" />
                <input
                  autoFocus
                  placeholder="Search countries"
                  aria-label="Search countries"
                  maxLength={120}
                  type="search"
                  value={countryQuery}
                  onChange={(event) => setCountryQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setCountryMenuOpen(false);
                    }
                  }}
                />
              </div>
              <div className="filter-menu-options">
                <button
                  className={!selectedCountry ? "selected" : ""}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCountry(null)}
                >
                  All countries
                </button>
                {filteredCountries.map((country) => (
                  <button
                    className={selectedCountry?.code === country.code ? "selected" : ""}
                    key={country.code}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectCountry(country)}
                  >
                    {country.name}
                  </button>
                ))}
                {filteredCountries.length === 0 ? (
                  <div className="filter-menu-empty">No countries found</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="filter-menu-field"
          onBlur={(event) => {
            const nextTarget = event.relatedTarget;

            if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
              setSortMenuOpen(false);
            }
          }}
        >
          <span className="filter-label">Sort</span>
          <button
            aria-controls={sortMenuId}
            aria-expanded={sortMenuOpen}
            className="filter-menu-trigger"
            type="button"
            onClick={() => setSortMenuOpen((open) => !open)}
          >
            <span>{selectedSort?.label ?? "Sort"}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {sortMenuOpen ? (
            <div className="filter-menu sort-menu" id={sortMenuId}>
              <div className="filter-menu-options">
                {sortOptions.map((option) => (
                  <button
                    className={option.id === sortId ? "selected" : ""}
                    key={option.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSort(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {selectedCountry ? (
        <div className="filter-actions">
          <button className="filter-chip" type="button" onClick={onClearCountrySelection}>
            {selectedCountry.name}
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
