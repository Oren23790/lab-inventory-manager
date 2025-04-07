import React, { useState, useEffect } from "react";
import saveAs from "file-saver";
import * as XLSX from "xlsx";
import {
  initializeApp,
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
  Date: new Date().toISOString().split("T")[0],
  OrderedBy: "",
  CostCentre: "",
  OfferNr: "",
  Nr: "",
  Category: "",
  Vendor: "",
  Item: "",
  CatNr: "",
  Qty: 1,
  UnitCost: 0,
  TotalCost: 0,
  DateRecvd: "",
  RecvdBy: "",
  Location: "",
  Hazardous: false,
  Comments: "",
  Leibniz: "",
  Maxima: "",
  HH2: "",
  DevCAR: "",
  Spenden: "",
  "PW-EniBHK": "",
  Mice: "",
};

const App = () => {
  const [data, setData] = useState([]);
  const [newEntry, setNewEntry] = useState(defaultFields);
  const [editId, setEditId] = useState(null);
  const [importPreview, setImportPreview] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const snapshot = await getDocs(collectionRef);
      const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setData(entries);
      setNewEntry(entries.length > 0
        ? Object.fromEntries(Object.keys(entries[0]).filter(k => k !== "id").map(k => [k, ""]))
        : defaultFields);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Failed to fetch data. Please check the console.");
    }
  };

  const handleChange = (key, value) => {
    if (key === "Qty" || key === "UnitCost") {
      value = parseFloat(value);
      const totalCost = (newEntry.Qty || (editId ? newEntry.Qty : 1)) * (newEntry.UnitCost || (editId ? newEntry.UnitCost : 0));
      setNewEntry({ ...newEntry, [key]: value, TotalCost: totalCost });
    } else {
      setNewEntry({ ...newEntry, [key]: value });
    }
  };

  const handleAdd = async () => {
    try {
      if (editId) {
        await updateDoc(doc(db, "labInventory", editId), newEntry);
        alert("✅ Entry updated!");
      } else {
        await addDoc(collectionRef, newEntry);
        alert("✅ Entry added!");
      }
      await fetchData();
      setNewEntry({ ...defaultFields, Date: new Date().toISOString().split("T")[0] });
      setEditId(null);
    } catch (error) {
      console.error("Error adding/updating entry:", error);
      alert("Failed to add/update entry. Please check the console.");
    }
  };

  const handleEdit = (entry) => {
    setEditId(entry.id);
    setNewEntry(Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "id")));
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "labInventory", id));
      setData(data.filter((entry) => entry.id !== id));
      alert("✅ Entry deleted!");
    } catch (error) {
      console.error("Error deleting entry:", error);
      alert("Failed to delete entry. Please check the console.");
    }
  };

  const mapColumns = (row) => ({
    Date: row["Date"] || new Date().toISOString().split("T")[0],
    OrderedBy: row["Ordered By"] || "",
    CostCentre: row["Cost centre"] || "",
    OfferNr: row["Offer nr."] || "",
    Nr: row["Nr."] || "",
    Category: row["Category"] || "",
    Vendor: row["Vendor"] || "",
    Item: row["Item"] || "",
    CatNr: row["Cat. #"] || "",
    Qty: row["Qty"] || 1,
    UnitCost: row["Unit Cost"] || 0,
    TotalCost: row["Total Cost"] || 0,
    DateRecvd: row["Date Recvd"] || "",
    RecvdBy: row["Recvd by"] || "",
    Location: row["Location"] || "",
    Hazardous: row["Hazardous"] || false,
    Comments: row["Comments"] || "",
    Leibniz: row["Leibniz"] || "",
    Maxima: row["Maxima"] || "",
    HH2: row["HH2"] || "",
    DevCAR: row["DevCAR"] || "",
    Spenden: row["Spenden"] || "",
    "PW-EniBHK": row["PW-EniBHK"] || "",
    Mice: row["Mice"] || "",
  });

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);
        const filtered = rawData.filter((row) => row["Item"] || row["Name"]);
        const mappedData = filtered.map(mapColumns);
        setImportPreview(mappedData);
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error("Error importing Excel file:", error);
      alert("Failed to import Excel file. Please check the console.");
    }
  };

  const handleConfirmImport = async () => {
    try {
      for (const row of importPreview) {
        await addDoc(collectionRef, row);
      }
      alert("✅ Purchases imported!");
      await fetchData();
      setImportPreview([]);
    } catch (error) {
      console.error("Error confirming import:", error);
      alert("Failed to import data. Please check the console.");
    }
  };

  const handleExport = () => {
    const toExport = data.map(({ id, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: "application/json" });
    saveAs(blob, "lab_inventory_data.json");
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={headingStyle}> Lab Inventory Manager</h1>
        <div style={formGridStyle}>
          {Object.entries(newEntry).map(([key, value]) => (
            <input
              key={key}
              placeholder={key}
              type={key === "Date" || key === "DateRecvd" ? "date" : key === "Qty" || key === "UnitCost" || key === "TotalCost" ? "number" : "text"}
              value={key === "UnitCost" || key === "TotalCost" ? value.toFixed(2) : value}
              onChange={(e) => handleChange(key, e.target.value)}
              style={inputStyle}
            />
          ))}
        </div>
        <div style={buttonContainerStyle}>
          <button onClick={handleAdd} style={buttonStyle(editId ? "#28a745" : "#007bff")}>
            {editId ? "✅ Update Entry" : "➕ Add Entry"}
          </button>
        </div>
        <hr style={dividerStyle} />
        <div style={importExportContainerStyle}>
          <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} style={inputStyle} />
          {importPreview.length > 0 && (
            <div>
              <h3 style={previewHeadingStyle}>Preview Import:</h3>
              <ul style={previewListStyle}>
                {importPreview.map((row, index) => (
                  <li key={index} style={previewListItemStyle}>
                    {`${row.Item} - ${row.Qty} @ ${row.Location} (${row.Date})`}
                  </li>
                ))}
              </ul>
              <button onClick={handleConfirmImport} style={buttonStyle("#17a2b8")}>
                Confirm Import
              </button>
            </div>
          )}
          <button onClick={handleExport} style={buttonStyle("#343a40")}>
             Export JSON
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles
const containerStyle = { padding: 32, fontFamily: "Arial, sans-serif", background: "#f9f9fb", minHeight: "100vh" };
const cardStyle = { maxWidth: 800, margin: "0 auto", background: "#fff", padding: 32, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };
const headingStyle = { fontSize: 32, fontWeight: 700, marginBottom: 24 };
const formGridStyle = { display: "grid", gap: 12, gridTemplateColumns: "repeat(6, 1fr)" };
const inputStyle = { padding: "12px 16px", fontSize: 14, borderRadius: 8, border: "1px solid #ccc", width: "100%" };
const buttonContainerStyle = { marginTop: 16, display: "flex", justifyContent: "flex-end" };
const buttonStyle = (bgColor) => ({ padding: "12px 20px", backgroundColor: bgColor, color: "white", fontSize: 14, border: "none", borderRadius: 8, cursor: "pointer" });
const dividerStyle = { margin: "32px 0" };
const importExportContainerStyle = { display: "flex", flexDirection: "column", gap: 16 };
const previewHeadingStyle = { fontSize: 20 };
const previewListStyle = { paddingLeft: 20 };
const previewListItemStyle = { marginBottom: 4 };

export default App;