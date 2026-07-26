"use client";

import { Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

type HospitalOption = {
  hospcode: string;
  hospname: string;
};

type HospitalAutocompleteProps = {
  hospitals: HospitalOption[];
};

const MAX_SUGGESTIONS = 8;

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("th");
}

export default function HospitalAutocomplete({
  hospitals,
}: HospitalAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HospitalOption | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const search = normalize(query);

    if (!search) {
      return [];
    }

    return hospitals
      .filter((hospital) => normalize(hospital.hospname).includes(search))
      .slice(0, MAX_SUGGESTIONS);
  }, [hospitals, query]);

  function chooseHospital(hospital: HospitalOption) {
    setQuery(hospital.hospname);
    setSelected(hospital);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div className={styles.hospitalAutocomplete}>
      <div className={styles.hospitalInputWrap}>
        <Search aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="พิมพ์ชื่อโรงพยาบาลหรือหน่วยบริการ"
          role="combobox"
          aria-label="ค้นหาโรงพยาบาลหรือหน่วยบริการ"
          aria-autocomplete="list"
          aria-expanded={isOpen && suggestions.length > 0}
          aria-controls="hospital-suggestions"
          aria-activedescendant={
            activeIndex >= 0
              ? `hospital-suggestion-${activeIndex}`
              : undefined
          }
          autoComplete="off"
          required
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && suggestions.length > 0) {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((index) =>
                index < suggestions.length - 1 ? index + 1 : 0,
              );
            } else if (event.key === "ArrowUp" && suggestions.length > 0) {
              event.preventDefault();
              setActiveIndex((index) =>
                index > 0 ? index - 1 : suggestions.length - 1,
              );
            } else if (event.key === "Enter" && activeIndex >= 0) {
              event.preventDefault();
              chooseHospital(suggestions[activeIndex]);
            } else if (event.key === "Escape") {
              setIsOpen(false);
              setActiveIndex(-1);
            }
          }}
        />
      </div>

      <input type="hidden" name="hospcode" value={selected?.hospcode ?? ""} />
      <input type="hidden" name="hospname" value={selected?.hospname ?? ""} />

      {isOpen && query && (
        <div
          id="hospital-suggestions"
          className={styles.hospitalSuggestions}
          role="listbox"
        >
          {suggestions.length > 0 ? (
            suggestions.map((hospital, index) => (
              <button
                id={`hospital-suggestion-${index}`}
                key={hospital.hospcode}
                type="button"
                role="option"
                aria-selected={selected?.hospcode === hospital.hospcode}
                className={
                  index === activeIndex ? styles.hospitalSuggestionActive : ""
                }
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseHospital(hospital)}
              >
                {hospital.hospname}
              </button>
            ))
          ) : (
            <p>ไม่พบโรงพยาบาลหรือหน่วยบริการ</p>
          )}
        </div>
      )}
    </div>
  );
}
