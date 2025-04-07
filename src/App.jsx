// ... the beginning of your code remains unchanged

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
    <div style={{ padding: 32, fontFamily: "Arial, sans-serif", background: "#f9f9fb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", background: "#fff", padding: 32, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>🧪 Lab Inventory Manager</h1>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          {Object.entries(newEntry).map(([key, value]) => (
            <input
              key={key}
              placeholder={key}
              type={key === "date" ? "date" : key === "quantity" ? "number" : "text"}
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              style={inputStyle}
            />
          ))}
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleAdd} style={buttonStyle("#28a745")}>
            {editId ? "✅ Update Entry" : "➕ Add Entry"}
          </button>
        </div>

        <hr style={{ margin: "32px 0" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} style={inputStyle} />

          {importPreview.length > 0 && (
            <div>
              <h3 style={{ fontSize: 20 }}>Preview Import:</h3>
              <ul style={{ paddingLeft: 20 }}>
                {importPreview.map((row, index) => (
                  <li key={index} style={{ marginBottom: 4 }}>{`${row.name} - ${row.quantity} @ ${row.location} (${row.date})`}</li>
                ))}
              </ul>
              <button onClick={handleConfirmImport} style={buttonStyle("#17a2b8")}>Confirm Import</button>
            </div>
          )}

          <button onClick={handleExport} style={buttonStyle("#343a40")}>📤 Export JSON</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: "12px 16px",
  fontSize: 14,
  borderRadius: 8,
  border: "1px solid #ccc",
  width: "100%"
};

const buttonStyle = (bgColor) => ({
  padding: "12px 20px",
  backgroundColor: bgColor,
  color: "white",
  fontSize: 14,
  border: "none",
  borderRadius: 8,
  cursor: "pointer"
});
