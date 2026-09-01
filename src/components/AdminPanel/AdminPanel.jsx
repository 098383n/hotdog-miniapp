
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../firebase/config";
import "./AdminPanel.css";

function AdminPanel() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      setLoading(true);

      const [productsSnapshot, ordersSnapshot, usersSnapshot] =
        await Promise.all([
          getDocs(collection(db, "products")),
          getDocs(collection(db, "orders")),
          getDocs(collection(db, "users")),
        ]);

      const productsList = productsSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const ordersList = ordersSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const usersList = usersSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setProducts(productsList);
      setOrders(ordersList);
      setUsers(usersList);
    } catch (error) {
      console.error(
        "Admin ma'lumotlarini yuklashda xatolik:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveProduct(event) {
    event.preventDefault();

    const productName = name.trim();
    const productDescription = description.trim();
    const productPrice = Number(price);

    if (!productName) {
      alert("Mahsulot nomini kiriting.");
      return;
    }

    if (!productPrice || productPrice <= 0) {
      alert("To'g'ri narx kiriting.");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        await updateDoc(doc(db, "products", editingId), {
          name: productName,
          description: productDescription,
          price: productPrice,
          updatedAt: serverTimestamp(),
        });

        alert("Mahsulot yangilandi.");
      } else {
        await addDoc(collection(db, "products"), {
          name: productName,
          description: productDescription,
          price: productPrice,
          createdAt: serverTimestamp(),
        });

        alert("Mahsulot qo'shildi.");
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error(
        "Mahsulotni saqlashda xatolik:",
        error
      );

      alert(
        "Mahsulotni saqlashda xatolik yuz berdi."
      );
    } finally {
      setSaving(false);
    }
  }

  function editProduct(product) {
    setEditingId(product.id);
    setName(product.name || "");
    setDescription(product.description || "");
    setPrice(product.price || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function removeProduct(id) {
    const confirmed = window.confirm(
      "Bu mahsulotni o'chirishni xohlaysizmi?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(db, "products", id));

      if (editingId === id) {
        resetForm();
      }

      await loadData();

      alert("Mahsulot o'chirildi.");
    } catch (error) {
      console.error(
        "Mahsulotni o'chirishda xatolik:",
        error
      );

      alert(
        "Mahsulotni o'chirishda xatolik yuz berdi."
      );
    }
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setPrice("");
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <h2>Admin panel yuklanmoqda...</h2>
      </div>
    );
  }

  return (
    <div className="admin-panel">

      <div className="admin-header">
        <div>
          <span className="admin-badge">
            ADMIN
          </span>

          <h1>
            Boshqaruv paneli
          </h1>

          <p>
            Hot-Dog do'konini boshqarish
          </p>
        </div>
      </div>

      {/* STATISTIKA */}

      <div className="admin-stats">

        <div className="admin-stat">
          <strong>{products.length}</strong>
          <span>Mahsulotlar</span>
        </div>

        <div className="admin-stat">
          <strong>{orders.length}</strong>
          <span>Buyurtmalar</span>
        </div>

        <div className="admin-stat">
          <strong>{users.length}</strong>
          <span>Foydalanuvchilar</span>
        </div>

      </div>

      {/* MAHSULOT QO'SHISH */}

      <section className="admin-card">

        <h2>
          {editingId
            ? "Mahsulotni tahrirlash"
            : "Yangi mahsulot qo'shish"}
        </h2>

        <form
          className="admin-form"
          onSubmit={saveProduct}
        >

          <input
            type="text"
            placeholder="Mahsulot nomi"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
          />

          <textarea
            placeholder="Mahsulot tavsifi"
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
          />

          <input
            type="number"
            placeholder="Narxi"
            min="1"
            value={price}
            onChange={(event) =>
              setPrice(event.target.value)
            }
          />

          <div className="admin-form-buttons">

            <button
              type="submit"
              className="admin-save-button"
              disabled={saving}
            >
              {saving
                ? "Saqlanmoqda..."
                : editingId
                ? "Saqlash"
                : "Mahsulot qo'shish"}
            </button>

            {editingId && (
              <button
                type="button"
                className="admin-cancel-button"
                onClick={resetForm}
                disabled={saving}
              >
                Bekor qilish
              </button>
            )}

          </div>

        </form>

      </section>

      {/* MAHSULOTLAR */}

      <section className="admin-card">

        <div className="admin-section-header">

          <h2>
            Mahsulotlar
          </h2>

          <span>
            {products.length} ta
          </span>

        </div>

        <div className="admin-products">

          {products.length === 0 ? (

            <p className="admin-empty">
              Hozircha mahsulotlar yo'q.
            </p>

          ) : (

            products.map((product) => (

              <div
                className="admin-product"
                key={product.id}
              >

                <div className="admin-product-info">

                  <strong>
                    {product.name}
                  </strong>

                  <span>
                    {product.description ||
                      "Tavsif yo'q"}
                  </span>

                  <b>
                    {Number(
                      product.price
                    ).toLocaleString()}{" "}
                    so'm
                  </b>

                </div>

                <div className="admin-product-actions">

                  <button
                    type="button"
                    className="admin-edit-button"
                    onClick={() =>
                      editProduct(product)
                    }
                  >
                    Tahrirlash
                  </button>

                  <button
                    type="button"
                    className="admin-delete-button"
                    onClick={() =>
                      removeProduct(product.id)
                    }
                  >
                    O'chirish
                  </button>

                </div>

              </div>

            ))

          )}

        </div>

      </section>

      {/* BUYURTMALAR */}

      <section className="admin-card">

        <div className="admin-section-header">

          <h2>
            Buyurtmalar
          </h2>

          <span>
            {orders.length} ta
          </span>

        </div>

        {orders.length === 0 ? (

          <p className="admin-empty">
            Hozircha buyurtmalar yo'q.
          </p>

        ) : (

          <div className="admin-list">

            {orders.map((order) => (

              <div
                className="admin-list-item"
                key={order.id}
              >

                <strong>
                  Buyurtma #{order.id}
                </strong>

                <span>
                  Status:{" "}
                  {order.status || "Yangi buyurtma"}
                </span>

              </div>

            ))}

          </div>

        )}

      </section>

      {/* FOYDALANUVCHILAR */}

      <section className="admin-card">

        <div className="admin-section-header">

          <h2>
            Foydalanuvchilar
          </h2>

          <span>
            {users.length} ta
          </span>

        </div>

        {users.length === 0 ? (

          <p className="admin-empty">
            Hozircha foydalanuvchilar yo'q.
          </p>

        ) : (

          <div className="admin-list">

            {users.map((user) => (

              <div
                className="admin-list-item"
                key={user.id}
              >

                <strong>
                  {user.firstName ||
                    user.first_name ||
                    "Noma'lum foydalanuvchi"}
                </strong>

                <span>
                  @{user.username ||
                    "username yo'q"}
                </span>

                <small>
                  Telegram ID:{" "}
                  {user.telegramId}
                </small>

                <small>
                  Role:{" "}
                  {user.role || "user"}
                </small>

              </div>

            ))}

          </div>

        )}

      </section>

    </div>
  );
}

export default AdminPanel;
