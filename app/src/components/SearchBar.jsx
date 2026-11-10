import Icon from "./Icon"

export default function SearchBar({ placeholder = "Search", value, onChange, onClick }) {
  if (onChange != null || value != null) {
    return (
      <div className="search-bar" onClick={onClick}>
        <Icon name="search" size={19} />
        <input
          type="text"
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            border: 0,
            outline: 0,
            background: "transparent",
            color: "inherit",
            font: "inherit",
            width: "100%",
          }}
        />
      </div>
    )
  }

  return (
    <button className="search-bar" type="button" onClick={onClick}>
      <Icon name="search" size={19} />
      <span>{placeholder}</span>
    </button>
  )
}
