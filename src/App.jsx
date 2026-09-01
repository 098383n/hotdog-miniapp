import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";

import { db } from "./firebase/config";
import AdminPanel from "./components/AdminPanel/AdminPanel";

import "./App.css";

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [telegramUser, setTelegramUser] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecking, setAdminChecking] = useState(true);

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  // =========================
  // TELEGRAM + ADMIN
  // =========================

  useEffect(() => {
    async function checkAdmin(telegramId) {
      // Firestore "==" ishlashi uchun telegramId turi (string yoki number)
      // bazadagi qiymat bilan aynan bir xil bo'lishi kerak.
      // Bazada qanday saqlanganini bilmasak ham ishlashi uchun,
      // ikkala turni ham tekshiramiz.
      const idAsNumber = Number(telegramId);
      const idAsString = String(telegramId);

      const candidates = Number.isNaN(idAsNumber)
        ? [idAsString]
        : [idAsNumber, idAsString];

      for (const candidateId of candidates) {
        // MUHIM: faqat bitta where() ishlatilmoqda (telegramId bo'yicha).
        // Ikkita turli maydon bo'yicha (telegramId + role) composite query
        // Firestore'da maxsus index talab qiladi va index bo'lmasa
        // "failed-precondition" xatoligi bilan yiqiladi (catch blokida
        // "ushlanib qoladi" va isAdmin jimgina false bo'lib qoladi).
        // Shu sababli role tekshiruvini JS tomonida qilamiz.
        const adminQuery = query(
          collection(db, "users"),
          where("telegramId", "==", candidateId),
          limit(1)
        );

        const adminSnapshot = await getDocs(adminQuery);

        console.log(
          `Admin tekshiruvi (telegramId=${candidateId}, turi=${typeof candidateId}):`,
          adminSnapshot.size,
          "ta hujjat topildi"
        );

        if (!adminSnapshot.empty) {
          const userData = adminSnapshot.docs[0].data();

          console.log("Topilgan foydalanuvchi role:", userData.role);

          if (userData.role === "admin") {
            return true;
          }
        }
      }

      return false;
    }

    async function initializeApp() {
      try {
        const tg = window.Telegram?.WebApp;

        let user = null;

        // =========================
        // TELEGRAM USER
        // =========================

        if (tg) {
          tg.ready();
          tg.expand();

          user = tg.initDataUnsafe?.user;

          console.log("Telegram user:", user);
          console.log("Telegram ID:", user?.id);

          if (user) {
            setTelegramUser(user);
          }
        } else {
          console.log(
            "Telegram WebApp topilmadi. Ilova Telegram ichida ochilmagan bo'lishi mumkin."
          );

          // VAQTINCHALIK: faqat lokal test uchun (production'da OLIB TASHLANG).
          // Brauzerda quyidagicha ochib test qilish mumkin:
          // http://localhost:3000/?admin_test_id=1874581050
          const testId = new URLSearchParams(
            window.location.search
          ).get("admin_test_id");

          if (testId) {
            user = { id: testId, first_name: "Test Admin" };
            console.log(
              "DEV MODE: URL orqali test Telegram ID ishlatilmoqda:",
              testId
            );
            setTelegramUser(user);
          }
        }

        // =========================
        // ADMIN TEKSHIRUVI
        // =========================

        if (user?.id) {
          console.log(
            "Admin tekshirilmoqda. Telegram ID:",
            user.id
          );

          const isUserAdmin = await checkAdmin(user.id);

          if (isUserAdmin) {
            console.log("ADMIN TOPILDI!");
            setIsAdmin(true);
          } else {
            console.log(
              "Bu Telegram foydalanuvchi admin emas (yoki 'users' collectionida mos hujjat yo'q)."
            );
            setIsAdmin(false);
          }
        } else {
          console.log("Telegram ID topilmadi.");
          setIsAdmin(false);
        }
      } catch (error) {
        // Bu yerda ko'pincha Firestore Security Rules ruxsat bermasa
        // ("permission-denied") yoki tarmoq muammosi bo'lsa xatolik chiqadi.
        console.error("Admin tekshirishda xatolik:", error);
        console.error("Xatolik kodi:", error?.code);
        console.error("Xatolik matni:", error?.message);

        setIsAdmin(false);
      } finally {
        setAdminChecking(false);
      }

      // =========================
      // PRODUCTS
      // =========================

      try {
        const snapshot = await getDocs(
          collection(db, "products")
        );

        const productsList = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setProducts(productsList);

        console.log("Mahsulotlar:", productsList);
      } catch (error) {
        console.error(
          "Mahsulotlarni yuklashda xatolik:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    initializeApp();
  }, []);

  // =========================
  // ADMIN LOADING
  // =========================

  if (adminChecking) {
    return (
      <div className="loading">
        <div className="loading-icon">👑</div>
        <p>Foydalanuvchi tekshirilmoqda...</p>
      </div>
    );
  }

  // =========================
  // ADMIN PANEL
  // =========================

  if (isAdmin) {
    return <AdminPanel />;
  }

  // =========================
  // PRODUCTS LOADING
  // =========================

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-icon">🍔</div>
        <p>Menyu yuklanmoqda...</p>
      </div>
    );
  }

  // =========================
  // SAVATCHA
  // =========================

  function addToCart(product) {
    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.id === product.id
      );

      if (existing) {
        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  }

  function increaseQuantity(id) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  }

  function decreaseQuantity(id) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function getQuantity(id) {
    const item = cart.find((item) => item.id === id);
    return item ? item.quantity : 0;
  }

  const cartQuantity = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (total, item) =>
      total + Number(item.price) * item.quantity,
    0
  );

  // =========================
  // MAIN SHOP
  // =========================

  return (
    <div className="app">
      {/* HEADER */}

      <header className="header">
        <div className="logo">🍔</div>

        <div>
          <h1>Hot-Dog</h1>
          <p>Mazali hot-doglar sizga yaqin</p>
        </div>
      </header>

      {/* TELEGRAM USER */}

      {telegramUser && (
        <div className="user-info">
          <div className="user-avatar">
            {telegramUser.first_name
              ?.charAt(0)
              ?.toUpperCase() || "👤"}
          </div>

          <div>
            <strong>
              Salom, {telegramUser.first_name}! 👋
            </strong>
            <span>Sizni ko‘rganimizdan xursandmiz</span>
          </div>
        </div>
      )}

      {/* MENU */}

      <div className="section-title">
        <h2>Bizning menyu</h2>
        <span>{products.length} ta mahsulot</span>
      </div>

      {/* PRODUCTS */}

      <div className="products">
        {products.map((product) => {
          const quantity = getQuantity(product.id);

          return (
            <div className="product-card" key={product.id}>
              <div className="product-image">🍔</div>

              <div className="product-content">
                <h2>{product.name}</h2>
                <p>{product.description}</p>

                <div className="product-bottom">
                  <strong>
                    {Number(product.price).toLocaleString()}{" "}
                    so‘m
                  </strong>

                  {quantity === 0 ? (
                    <button
                      type="button"
                      className="add-button"
                      onClick={() => addToCart(product)}
                    >
                      Savatga qo‘shish
                    </button>
                  ) : (
                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() =>
                          decreaseQuantity(product.id)
                        }
                      >
                        −
                      </button>

                      <span>{quantity}</span>

                      <button
                        type="button"
                        onClick={() =>
                          increaseQuantity(product.id)
                        }
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CART BAR */}

      {cartQuantity > 0 && (
        <button
          type="button"
          className="cart-bar"
          onClick={() => setCartOpen(true)}
        >
          <div>
            <span className="cart-count">{cartQuantity}</span>
            <span>Savat</span>
          </div>

          <strong>{cartTotal.toLocaleString()} so‘m</strong>
        </button>
      )}

      {/* CART */}

      {cartOpen && (
        <div
          className="cart-overlay"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="cart-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cart-header">
              <h2>🛒 Savat</h2>

              <button
                type="button"
                className="close-cart"
                onClick={() => setCartOpen(false)}
              >
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <div>🛒</div>
                <p>Savat bo‘sh</p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.id}>
                      <div className="cart-item-image">🍔</div>

                      <div className="cart-item-info">
                        <strong>{item.name}</strong>

                        <span>
                          {Number(item.price).toLocaleString()}{" "}
                          so‘m
                        </span>

                        <div className="cart-quantity">
                          <button
                            type="button"
                            onClick={() =>
                              decreaseQuantity(item.id)
                            }
                          >
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            type="button"
                            onClick={() =>
                              increaseQuantity(item.id)
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <strong className="cart-item-total">
                        {(
                          Number(item.price) * item.quantity
                        ).toLocaleString()}{" "}
                        so‘m
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="cart-total">
                  <span>Jami</span>
                  <strong>
                    {cartTotal.toLocaleString()} so‘m
                  </strong>
                </div>

                <button
                  type="button"
                  className="checkout-button"
                  onClick={() => {
                    console.log("Buyurtma:", cart);
                  }}
                >
                  Buyurtma berish
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;