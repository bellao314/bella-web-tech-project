import Icon from "./Icon"
export default function SettingsList({ items }) { return <section className="settings-list">{items.map(([label, icon]) => <button key={label}><span><Icon name={icon} size={18} /></span><strong>{label}</strong><Icon name="chevron" size={17} /></button>)}</section> }
