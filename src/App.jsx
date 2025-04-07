import { useEffect, useState } from "react";
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
  apiKey: "AIzaSyB0QccZQckEz9pZfeNCZRgquJYacCsO1AE",
  authDomain: "lab-inventory-65591.firebaseapp.com",
  projectId: "lab-inventory-65591",
  storageBucket: "lab-inventory-65591.firebasestorage.app",
  messagingSenderId: "968489471672",
  appId: "1:968489471672:web:34051082644f136a946e4d",
  measurementId: "G-YT4YLKQK69"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const purchasesCollection = collection(db, "purchases");

// Options for dropdown menus
const costCenterOptions = [
  "HH", "Leibniz", "Maxima", "HH2", "DevCAR", "Spenden", "PW-EniBHK", "Mice"
];

const categoryOptions = [
  "Chemicals", "Equipment", "Office Supplies", "Computers & Hardware", "Lab Supplies", "Other/Miscellaneous"
];

// Default fields for new purchase entries
const defaultFields = {
  dateOrdered: new Date().toISOString().split("T")[0],
  orderedBy: "",
  costCentre: "",
  offerNr: "",
  prNr: "",
  category: "",
  vendor: "",
  item: "", 
  catalogNumber: "",
  quantity: 1,
  unitCost: 0,
  totalCost: 0,
  dateReceived: "",
  receivedBy: "",
  location: "",
  hazardous: false,
  comments: ""
};

export default function App() {
  const [purchases, setPurchases] = useState([]);
  const [newPurchase, setNewPurchase] = useState(defaultFields);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load purchases on initial render
  useEffect(() => {
    fetchPurchases();
  }, []);

  // Fetch all purchases from Firestore
  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const snapshot = await getDocs(purchasesCollection);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPurchases(data);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      alert("Failed to load purchases");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes
  const handleChange = (key, value) => {
    let updatedPurchase = { ...newPurchase, [key]: value };
    
    // Auto-calculate total cost when unit cost or quantity changes
    if (key === "unitCost" || key === "quantity") {
      const unitCost = key === "unitCost" ? parseFloat(value) : parseFloat(newPurchase.unitCost);
      const quantity = key === "quantity" ? parseInt(value) : parseInt(newPurchase.quantity);
      
      if (!isNaN(unitCost) && !isNaN(quantity)) {
        updatedPurchase.totalCost = (unitCost * quantity).toFixed(2);
      }
    }
    
    setNewPurchase(updatedPurchase);
  };

  // Add or update a purchase
  const handleSubmit = async () => {
    if (!newPurchase.item || !newPurchase.dateOrdered) {
      alert("Please fill in at least the item name and order date");
      return;
    }

    try {
      if (editId) {
        const purchaseRef = doc(db, "purchases", editId);
        await updateDoc(purchaseRef, newPurchase);
        alert("Purchase updated successfully!");
      } else {
        await addDoc(purchasesCollection, newPurchase);
        alert("Purchase added successfully!");
      }
      
      await fetchPurchases();
      resetForm();
    } catch (error) {
      console.error("Error saving purchase:", error);
      alert("Failed to save purchase");
    }
  };

  // Reset the form to default values
  const resetForm = () => {
    setNewPurchase({
      ...defaultFields,
      dateOrdered: new Date().toISOString().split("T")[0]
    });
    setEditId(null);
  };

  // Load purchase data into form for editing
  const handleEdit = (purchase) => {
    setEditId(purchase.id);
    setNewPurchase(Object.fromEntries(Object.entries(purchase).filter(([key]) => key !== "id")));
  };

  // Delete a purchase
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this purchase?")) {
      try {
        await deleteDoc(doc(db, "purchases", id));
        setPurchases(purchases.filter((purchase) => purchase.id !== id));
        alert("Purchase deleted successfully");
      } catch (error) {
        console.error("Error deleting purchase:", error);
        alert("Failed to delete purchase");
      }
    }
  };

  // Import purchases from Excel file
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);
        
        // Map Excel columns to our data structure
        const purchases = rawData.map(row => ({
          dateOrdered: row["Date Ordered"] || new Date().toISOString().split("T")[0],
          orderedBy: row["Ordered By"] || "",
          costCentre: row["Cost centre"] || "",
          offerNr: row["Offer nr."] || "",
          prNr: row["Nr."] || row["PR#"] || "",
          category: row["Category"] || "",
          vendor: row["Vendor"] || "",
          item: row["Item"] || "",
          catalogNumber: row["Cat. #"] || "",
          quantity: row["Qty"] || 1,
          unitCost: parseFloat(row["Unit Cost"] || 0),
          totalCost: parseFloat(row["Total Cost"] || 0),
          dateReceived: row["Date Recvd"] || "",
          receivedBy: row["Recvd by"] || "",
          location: row["Location"] || "",
          hazardous: row["Hazardous"] === "TRUE" || row["Hazardous"] === true,
          comments: row["Comments"] || ""
        }));
        
        // Filter out entries without an item
        const validPurchases = purchases.filter(p => p.item);
        
        // Insert all purchases into Firestore
        for (const purchase of validPurchases) {
          await addDoc(purchasesCollection, purchase);
        }
        
        alert(`Successfully imported ${validPurchases.length} purchases!`);
        await fetchPurchases();
      } catch (error) {
        console.error("Error importing data:", error);
        alert("Failed to import data");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Export purchases to Excel
  const handleExport = () => {
    try {
      // Create worksheet from purchases data
      const ws = XLSX.utils.json_to_sheet(
        purchases.map(({ id, ...data }) => data)
      );
      
      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Purchases");
      
      // Generate Excel file and download
      XLSX.writeFile(wb, "purchases_export.xlsx");
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Failed to export data");
    }
  };

  // Format currency value
  const formatCurrency = (value) => {
    if (!value) return "0.00 €";
    return `${parseFloat(value).toFixed(2)} €`;
  };

  // Filter purchases by search term
  const filteredPurchases = purchases.filter((purchase) => {
    if (!search) return true;
    
    const searchLower = search.toLowerCase();
    return (
      (purchase.item && purchase.item.toLowerCase().includes(searchLower)) ||
      (purchase.vendor && purchase.vendor.toLowerCase().includes(searchLower)) ||
      (purchase.prNr && purchase.prNr.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div style={{ padding: "2rem", background: "#f5f5f5", fontFamily: "Arial, sans-serif", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", background: "white", padding: "2rem", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "1.5rem", color: "#333" }}>
          🛒 Purchase Management System
        </h1>

        {/* Form for adding/editing purchases */}
        <div style={{ marginBottom: "2rem", padding: "1.5rem", border: "1px solid #e0e0e0", borderRadius: "8px" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem" }}>
            {editId ? "Edit Purchase" : "Add New Purchase"}
          </h2>
          
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {/* Order Details */}
            <div style={{ gridColumn: "1 / -1" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem", fontWeight: "bold" }}>Order Details</h3>
            </div>
            
            <div>
              <label style={labelStyle}>Date Ordered*</label>
              <input
                type="date"
                value={newPurchase.dateOrdered}
                onChange={(e) => handleChange("dateOrdered", e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            
            <div>
              <label style={labelStyle}>Ordered By</label>
              <input
                type="text"
                value={newPurchase.orderedBy}
                onChange={(e) => handleChange("orderedBy", e.target.value)}
                style={inputStyle}
                placeholder="Your initials"
              />
            </div>
            
            <div>
              <label style={labelStyle}>Cost Centre</label>
              <select 
                value={newPurchase.costCentre} 
                onChange={(e) => handleChange("costCentre", e.target.value)}
                style={inputStyle}
              >
                <option value="">Select cost centre</option>
                {costCenterOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={labelStyle}>Offer Nr.</label>
              <input
                type="text"
                value={newPurchase.offerNr}
                onChange={(e) => handleChange("offerNr", e.target.value)}
                style={inputStyle}
              />
            </div>
            
            <div>
              <label style={labelStyle}>PR Number</label>
              <input
                type="text"
                value={newPurchase.prNr}
                onChange={(e) => handleChange("prNr", e.target.value)}
                style={inputStyle}
                placeholder="e.g., PR548377"
              />
            </div>
            
            {/* Item Details */}
            <div style={{ gridColumn: "1 / -1", marginTop: "1rem" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem", fontWeight: "bold" }}>Item Details</h3>
            </div>
            
            <div>
              <label style={labelStyle}>Category</label>
              <select 
                value={newPurchase.category} 
                onChange={(e) => handleChange("category", e.target.value)}
                style={inputStyle}
              >
                <option value="">Select category</option>
                {categoryOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={labelStyle}>Vendor</label>
              <input
                type="text"
                value={newPurchase.vendor}
                onChange={(e) => handleChange("vendor", e.target.value)}
                style={inputStyle}
              />
            </div>
            
            <div>
              <label style={labelStyle}>Item Name*</label>
              <input
                type="text"
                value={newPurchase.item}
                onChange={(e) => handleChange("item", e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            
            <div>
              <label style={labelStyle}>Catalog #</label>
              <input
                type="text"
                value={newPurchase.catalogNumber}
                onChange={(e) => handleChange("catalogNumber", e.target.value)}
                style={inputStyle}
              />
            </div>
            
            {/* Cost Information */}
            <div>
              <label style={labelStyle}>Quantity</label>
              <input
                type="number"
                min="1"
                value={newPurchase.quantity}
                onChange={(e) => handleChange("quantity", e.target.value)}
                style={inputStyle}
              />
            </div>
            
            <div>
              <label style={labelStyle}>Unit Cost (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newPurchase.unitCost}
                onChange={(e) => handleChange("unitCost", e.target.value)}
                style={inputStyle}
              />
            </div>
            
            <div>
              <label style={labelStyle}>Total Cost (€)</label>
              <input
                type="number"
                step="0.01"
                value={newPurchase.totalCost}
                onChange={(e) => handleChange("totalCost", e.target.value)}
                style={inputStyle}
                readOnly
              />
            </div>
            
            {/* Receiving Information */}
            <div style={{ gridColumn: "1 / -1", marginTop: "1rem" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem", fontWeight: "bold" }}>Receiving Information</h3>
            </div>
            
            <div>
              <label style={labelStyle}>Date Received</label>
              <input
                type="date"
                value={newPurchase.dateReceived}
                onChange={(e) => handleChange("dateReceived", e.target.value)}
                style={inputStyle}
              />
            </div>
            
            <div>
              <label style={labelStyle}>Received By</label>
              <input
                type="text"
                value={newPurchase.receivedBy}
                onChange={(e) => handleChange("receivedBy", e.target.value)}
                style={inputStyle}
              />
            </div>
            
            <div>
              <label style={labelStyle}>Location</label>
              <input
                type="text"
                value={newPurchase.location}
                onChange={(e) => handleChange("location", e.target.value)}
                style={inputStyle}
                placeholder="e.g., Office KG"
              />
            </div>
            
            <div style={{ display: "flex", alignItems: "center", marginTop: "1rem" }}>
              <label style={{ marginRight: "0.5rem" }}>Hazardous</label>
              <input
                type="checkbox"
                checked={newPurchase.hazardous}
                onChange={(e) => handleChange("hazardous", e.target.checked)}
              />
            </div>
            
            {/* Comments */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Comments</label>
              <textarea
                value={newPurchase.comments}
                onChange={(e) => handleChange("comments", e.target.value)}
                style={{ ...inputStyle, width: "100%", minHeight: "60px" }}
              />
            </div>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
            <button onClick={resetForm} style={buttonStyle("#6c757d")}>
              Cancel
            </button>
            <button onClick={handleSubmit} style={buttonStyle("#28a745")}>
              {editId ? "Update Purchase" : "Add Purchase"}
            </button>
          </div>
        </div>

        {/* Import/Export and Search */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div>
              <label style={{ ...labelStyle, marginBottom: "0.5rem" }}>Import Purchases (.xlsx)</label>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleImportExcel} 
                style={{ ...inputStyle, padding: "0.25rem" }} 
              />
            </div>
            <button onClick={handleExport} style={{ ...buttonStyle("#343a40"), height: "fit-content", marginTop: "auto" }}>
              Export to Excel
            </button>
          </div>
          
          <div>
            <label style={{ ...labelStyle, marginBottom: "0.5rem" }}>Search</label>
            <input
              type="text"
              placeholder="Search items, vendors, PR numbers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Purchases Table */}
        <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem" }}>
          Purchase Records ({filteredPurchases.length})
        </h2>
        
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>Loading purchases...</div>
        ) : filteredPurchases.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
            {search ? "No purchases match your search" : "No purchases found. Add your first purchase or import from Excel."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  <th style={thStyle}>Date Ordered</th>
                  <th style={thStyle}>By</th>
                  <th style={thStyle}>Cost Centre</th>
                  <th style={thStyle}>PR#</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Vendor</th>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Cat. #</th>
                  <th style={thStyle}>Qty</th>
                  <th style={thStyle}>Unit Cost</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Date Received</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} style={{ borderBottom: "1px solid #e0e0e0" }}>
                    <td style={tdStyle}>{purchase.dateOrdered}</td>
                    <td style={tdStyle}>{purchase.orderedBy}</td>
                    <td style={tdStyle}>{purchase.costCentre}</td>
                    <td style={tdStyle}>{purchase.prNr}</td>
                    <td style={tdStyle}>{purchase.category}</td>
                    <td style={tdStyle}>{purchase.vendor}</td>
                    <td style={tdStyle}><strong>{purchase.item}</strong></td>
                    <td style={tdStyle}>{purchase.catalogNumber}</td>
                    <td style={tdStyle}>{purchase.quantity}</td>
                    <td style={tdStyle}>{formatCurrency(purchase.unitCost)}</td>
                    <td style={tdStyle}><strong>{formatCurrency(purchase.totalCost)}</strong></td>
                    <td style={tdStyle}>{purchase.dateReceived || "-"}</td>
                    <td style={tdStyle}>
                      {purchase.location}
                      {purchase.hazardous && <span style={{ marginLeft: "0.5rem", color: "red" }}>⚠️</span>}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => handleEdit(purchase)} style={actionButtonStyle("#007bff")}>Edit</button>
                        <button onClick={() => handleDelete(purchase.id)} style={actionButtonStyle("#dc3545")}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const labelStyle = {
  display: "block",
  fontWeight: "500",
  marginBottom: "0.25rem",
  fontSize: "0.875rem"
};

const inputStyle = {
  padding: "0.5rem",
  borderRadius: "4px",
  border: "1px solid #ccc",
  width: "100%",
  fontSize: "0.875rem"
};

const buttonStyle = (bgColor) => ({
  padding: "0.5rem 1rem",
  backgroundColor: bgColor,
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "0.875rem"
});

const actionButtonStyle = (bgColor) => ({
  padding: "0.25rem 0.5rem",
  backgroundColor: bgColor,
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "0.75rem"
});

const thStyle = {
  padding: "0.75rem 0.5rem",
  textAlign: "left",
  fontWeight: "bold",
  borderBottom: "2px solid #e0e0e0",
  whiteSpace: "nowrap"
};

const tdStyle = {
  padding: "0.75rem 0.5rem",
  borderBottom: "1px solid #e0e0e0",
  fontSize: "0.875rem"
};