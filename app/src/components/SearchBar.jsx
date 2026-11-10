import { useRef } from "react"
import Icon from "./Icon"

export default function SearchBar({ placeholder = "Search", value, onChange, onClick, ...props }) {
  const inputRef = useRef(null)
  const isControlled = value !== undefined || onChange !== undefined

  const handleClick = (e) => {
    inputRef.current?.focus()
    onClick?.(e)
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
    </div>
  )
}
