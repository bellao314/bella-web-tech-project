import Icon from "./Icon"
export default function SearchBar({ placeholder, onClick }) { return <button className="search-bar" onClick={onClick}><Icon name="search" size={19} /><span>{placeholder}</span></button> }
