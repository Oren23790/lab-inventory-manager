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
    setNewEntry(Object.fromEntries(Object.keys(newEntry).map((k) => [k, ""])));
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
    <div style={{ padding: 32 }}>
      <h1>🧪 Lab Inventory Manager (Firebase)</h1>
      <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} style={{ marginBottom: 16 }} />
      {importPreview.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3>Preview Import:</h3>
          <ul>
            {importPreview.map((row, index) => (
              <li key={index}>{`${row.name} - ${row.quantity} @ ${row.location}`}</li>
            ))}
          </ul>
          <button onClick={handleConfirmImport} style={buttonStyle("#28a745")}>Confirm Import</button>
        </div>
      )}
      <button onClick={handleExport}>Export JSON</button>
      {/* Add buttons and tables here... */}
    </div>
  );
}

const buttonStyle = (bgColor) => ({
  padding: "10px 16px",
  backgroundColor: bgColor,
  color: "white",
  border: "none",
  borderRadius: 6,
});