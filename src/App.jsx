import { useEffect, useState } from "react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB0QccZQckEz9pZfeNCZRgquJYacCsO1AE",
  authDomain: "lab-inventory-65591.firebaseapp.com",
  projectId: "lab-inventory-65591",
  storageBucket: "lab-inventory-65591.firebasestorage.app",
  messagingSenderId: "968489471672",
  appId: "1:968489471672:web:34051082644f136a946e4d",
  measurementId: "G-YT4YLKQK69"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const collectionRef = collection(db, "labInventory");

export default function App() {
  const [data, setData] = useState([]);
  const [newEntry, setNewEntry] = useState({});
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collectionRef);
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setData(entries);
      if (entries[0]) {
        setNewEntry(Object.fromEntries(Object.keys(entries[0]).filter(k => k !== "id").map(k => [k, ""])));
      }
    };
    fetchData();
  }, []);

  const handleChange = (key, value) => {
    setNewEntry({ ...newEntry, [key]: value });
  };

  const handleAdd = async () => {
    if (editId) {
      const entryRef = doc(db, "labInventory", editId);
      await updateDoc(entryRef, newEntry);
    } else {
      await addDoc(collectionRef, newEntry);
    }
    const snapshot = await getDocs(collectionRef);
    setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setNewEntry(Object.fromEntries(Object.keys(newEntry).map(k => [k, ""])));
    setEditId(null);
  };

  const handleEdit = (entry) => {
    setEditId(entry.id);
    setNewEntry(Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "id")));
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "labInventory", id));
    setData(data.filter(entry => entry.id !== id));
  };

  const handleExport = () => {
    const toExport = data.map(({ id, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: "application/json" });
    saveAs(blob, "lab_inventory_data.json");
  };

  const handleExportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(data.map(({ id, ...rest }) => rest));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const csv = XLSX.write(wb, { bookType: "csv", type: "binary" });
    const blob = new Blob([new Uint8Array([...csv].map(char => char.charCodeAt(0)))], { type: 'text/csv' });
    saveAs(blob, "lab_inventory_data.csv");
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.map(({ id, ...rest }) => rest));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "lab_inventory_data.xlsx");
  };

  const filteredData = data.filter(entry =>
    Object.values(entry).some(val => String(val).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ padding: 32, fontFamily: "Arial, sans-serif", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 24 }}>🧪 Lab Inventory Manager (Firebase)</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleExport} style={buttonStyle("#007bff")}>📤 Export JSON</button>
          <button onClick={handleExportCSV} style={buttonStyle("#17a2b8")}>📄 Export CSV</button>
          <button onClick={handleExportExcel} style={buttonStyle("#6f42c1")}>📊 Export Excel</button>
        </div>
      </div>

      <input
        placeholder="🔍 Search purchases..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: 12, width: "100%", marginBottom: 24, fontSize: 16, borderRadius: 8, border: "1px solid #ccc" }}
      />

      {Object.keys(newEntry).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
          {Object.keys(newEntry).map((key) => (
            <input
              key={key}
              placeholder={key}
              value={newEntry[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              style={{ padding: 10, fontSize: 14, borderRadius: 6, border: "1px solid #ccc" }}
            />
          ))}
          <button
            onClick={handleAdd}
            style={{ gridColumn: "1 / -1", padding: 12, fontSize: 16, backgroundColor: editId ? "#f0ad4e" : "#28a745", color: "white", border: "none", borderRadius: 6 }}
          >
            {editId ? "✅ Update Entry" : "➕ Add Entry"}
          </button>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead style={{ backgroundColor: "#f5f5f5" }}>
            <tr>
              {data[0] && Object.keys(data[0]).filter(k => k !== "id").map((key) => (
                <th key={key} style={{ padding: 8, borderBottom: "2px solid #ddd", textAlign: "left" }}>{key}</th>
              ))}
              <th style={{ padding: 8, borderBottom: "2px solid #ddd" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: "1px solid #eee" }}>
                {Object.entries(entry).filter(([key]) => key !== "id").map(([key, val]) => (
                  <td key={key} style={{ padding: 8 }}>{String(val)}</td>
                ))}
                <td style={{ padding: 8 }}>
                  <button onClick={() => handleEdit(entry)} style={{ marginRight: 6, padding: "4px 8px", fontSize: 12 }}>✏️</button>
                  <button onClick={() => handleDelete(entry.id)} style={{ padding: "4px 8px", fontSize: 12, backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: 4 }}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const buttonStyle = (bgColor) => ({
  padding: "10px 16px",
  backgroundColor: bgColor,
  color: "white",
  border: "none",
  borderRadius: 6
});
