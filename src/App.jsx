import { useEffect, useState } from "react";
import saveAs from "file-saver";
import * as XLSX from "xlsx";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

const firebaseConfig = {
  // ... your Firebase config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const collectionRef = collection(db, "labInventory");

const defaultFields = {
  name: "",
  quantity: "",
  location: "",
  date: new Date().toISOString().split("T")[0],
  Leibniz: "",
  Maxima: "",
  HH2: "",
  DevCAR: "",
  Spenden: "",
  "PW-EniBHK": "",
};

export default function App() {
  const [data, setData] = useState([]);
  const [newEntry, setNewEntry] = useState(defaultFields);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [importPreview, setImportPreview] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collectionRef);
      const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setData(entries);
      if (entries.length > 0) {
        setNewEntry(Object.fromEntries(Object.keys(entries[0]).filter(k => k !== "id").map(k => [k, ""])));
      } else {
        setNewEntry(defaultFields);
      }
    };
    fetchData();
  }, []);

  const handleChange = (key, value) => setNewEntry({ ...newEntry, [key]: value });

  const handleAdd = async () => {
    if (editId) {
      const entryRef = doc(db, "labInventory", editId);
      await updateDoc(entryRef, newEntry);
      alert("✅ Entry updated!");
    } else {
      await addDoc(collectionRef, newEntry);
      alert("✅ Entry added!");
    }
    const snapshot = await getDocs(collectionRef);
    const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setData(entries);
    setNewEntry({ ...defaultFields, date: new Date().toISOString().split("T")[0] });
    setEditId(null);
  };

  const handleEdit = (entry) => {
    setEditId(entry.id);
    setNewEntry(Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "id")));
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "labInventory", id));
    setData(data.filter((entry) => entry.id !== id));
  };

  const mapColumns = (row) => {
    return {
      name: row["Item"] || row["Name"] || row["Product"] || "Unnamed",
      quantity: row["Qty"] || row["Quantity"] || 1,
      location: row["Location"] || "",
      date: row["Date"] || new Date().toISOString().split("T")[0],
      Leibniz: row["Leibniz"] || "",
      Maxima: row["Maxima"] || "",
      HH2: row["HH2"] || "",
      DevCAR: row["DevCAR"] || "",
      Spenden: row["Spenden"] || "",
      "PW-EniBHK": row["PW-EniBHK"] || "",
    };
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData = XLSX.utils.sheet_to_json(ws);
      const filtered = rawData.filter(row => row["Item"] || row["Name"]);
      const mappedData = filtered.map(mapColumns);
      setImportPreview(mappedData);
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    for (const row of importPreview) {
      await addDoc(collectionRef, row);
    }
    alert("✅ Purchases imported!");
    const snapshot = await getDocs(collectionRef);
    const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setData(entries);
    setImportPreview([]);
  };

  const handleExport = () => {
    const toExport = data.map(({ id, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: "application/json" });
    saveAs(blob, "lab_inventory_data.json");
  };

  return (
    <div style={{ padding: "3rem", background: "#f0f2f5", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", background: "white", padding: "2rem", borderRadius: "1rem", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem", color: "#333" }}>🧪 Lab Inventory Manager</h1>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: "1.5rem" }}>
          {Object.entries(newEntry).map(([key, value]) => (
            <div key={key} style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ marginBottom: 4, fontWeight: 500, color: "#555" }}>{key}</label>
              <input
                type={key === "date" ? "date" : key === "quantity" ? "number" : "text"}
                value={value}
                onChange={(e) => handleChange(key, e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "2rem" }}>
          <button onClick={handleAdd} style={buttonStyle("#28a745")}>{editId ? "✅ Update Entry" : "➕ Add Entry"}</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <label style={{ fontWeight: 600 }}>📥 Import Purchases (.xlsx):</label>
          <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} style={{ ...inputStyle, padding: "10px" }} />

          {importPreview.length > 0 && (
            <div>
              <h3 style={{ fontSize: "1.25rem", margin: "1rem 0" }}>📝 Preview Import:</h3>
              <ul style={{ listStyle: "disc", paddingLeft: "1.25rem" }}>
                {importPreview.map((row, index) => (
                  <li key={index}>{`${row.name} - ${row.quantity} @ ${row.location} (${row.date})`}</li>
                ))}
              </ul>
              <button onClick={handleConfirmImport} style={buttonStyle("#17a2b8")}>✅ Confirm Import</button>
            </div>
          )}

          <button onClick={handleExport} style={buttonStyle("#343a40")}>📤 Export JSON</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: "10px 14px",
  fontSize: "14px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  backgroundColor: "#fff",
  outline: "none"
};

const buttonStyle = (bgColor) => ({
  padding: "10px 16px",
  backgroundColor: bgColor,
  color: "white",
  fontWeight: 600,
  fontSize: "14px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  transition: "background 0.2s ease"
});