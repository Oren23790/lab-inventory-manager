import { useState } from "react";

const initialData = [
  {
    "Date": "2024-03-08",
    "Ordered By": "KG",
    "Cost centre": "HH",
    "Offer nr.": null,
    "Nr.": "PR547018",
    "Category": "Other/Miscellaneous",
    "Vendor": "ebissLager",
    "Item": "Battery AA",
    "Cat. #": 7672,
    "Qty": 6,
    "Unit Cost": 0.38,
    "Total Cost": 2.28,
    "Date Recvd": "2024-03-08",
    "Recvd by": "KG",
    "Location": "Office KG",
    "Hazardous": false,
    "Comments": null,
    "Leibniz": null,
    "Maxima": null,
    "HH2": 2.28,
    "DevCAR": null,
    "Spenden": null,
    "PW-EniBHK": null,
    "Mice": null
  }
];

export default function App() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState(initialData);
  const [newEntry, setNewEntry] = useState(Object.fromEntries(Object.keys(initialData[0]).map(key => [key, ""])));
  const [editIndex, setEditIndex] = useState(null);

  const filterData = (items) => {
    return items.filter((entry) =>
      Object.values(entry).some((val) =>
        String(val).toLowerCase().includes(search.toLowerCase())
      )
    );
  };

  const handleChange = (key, value) => {
    setNewEntry({ ...newEntry, [key]: value });
  };

  const handleAdd = () => {
    if (editIndex !== null) {
      const updated = [...data];
      updated[editIndex] = newEntry;
      setData(updated);
      setEditIndex(null);
    } else {
      setData([...data, newEntry]);
    }
    setNewEntry(Object.fromEntries(Object.keys(initialData[0]).map(key => [key, ""])));
  };

  const handleEdit = (index) => {
    setNewEntry(data[index]);
    setEditIndex(index);
  };

  const handleDelete = (index) => {
    const updated = [...data];
    updated.splice(index, 1);
    setData(updated);
  };

  return (
    <div style={{ padding: "24px", fontFamily: "Arial" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Lab Purchases</h1>

      <input
        placeholder="Search purchases..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: "8px", marginBottom: "16px", width: "100%" }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
        {Object.keys(newEntry).map((key) => (
          <input
            key={key}
            placeholder={key}
            value={newEntry[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            style={{ padding: "6px" }}
          />
        ))}
        <button onClick={handleAdd} style={{ gridColumn: "span 2", padding: "10px", marginTop: "8px" }}>
          {editIndex !== null ? "Update Entry" : "Add Entry"}
        </button>
      </div>

      <table border="1" cellPadding="6" cellSpacing="0" style={{ width: "100%", fontSize: "14px" }}>
        <thead>
          <tr>
            {Object.keys(initialData[0]).map((key) => (
              <th key={key}>{key}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filterData(data).map((entry, idx) => (
            <tr key={idx}>
              {Object.values(entry).map((val, i) => (
                <td key={i}>{String(val)}</td>
              ))}
              <td>
                <button onClick={() => handleEdit(idx)} style={{ marginRight: "4px" }}>Edit</button>
                <button onClick={() => handleDelete(idx)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
