import { useRef } from "react"
import Icon from "./Icon"

export default function SearchBar({ placeholder = "Search", value, onChange, onClear, onClick, ...props }) {
  const inputRef = useRef(null)
  const isControlled = value !== undefined || onChange !== undefined

  const handleClick = (e) => {
    inputRef.current?.focus()
    onClick?.(e)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    if (onClear) {
      onClear()
    } else if (onChange) {
      onChange({ target: { value: "" } })
    }
    inputRef.current?.focus()
  }

  return (
    <div className="search-bar" onClick={handleClick}>
      <Icon name="search" size={19} />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          border: 0,
          outline: 0,
          background: "transparent",
          color: "inherit",
          font: "inherit",
          fontSize: "inherit",
          width: "100%",
        }}
        {...(isControlled ? { value: value ?? "", onChange } : {})}
        {...props}
      />
      {Boolean(value) && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          style={{
            border: 0,
            background: "none",
            color: "#847f8b",
            cursor: "pointer",
            padding: "2px 4px",
            fontSize: "16px",
            lineHeight: 1,
            display: "grid",
            placeItems: "center",
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
