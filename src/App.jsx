
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase/config";
import "./App.css";

function App() {
  const [telegramUser, setTelegramUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);

  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState(null);

  const [checkoutError, setCheckoutError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(null);

  // =========================
  // TELEGRAM
  // =========================

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      console.warn("Telegram WebApp не найден");
      return;
    }

    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe?.user;

    if (user) {
      setTelegramUser(user);
    } else {
      console.warn("Telegram user не найден");
    }
  }, []);

  // =========================
  // LOAD PRODUCTS
  // =========================

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "products"));

        const productsData = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setProducts(productsData);
      } catch (error) {
        console.error("Ошибка загрузки товаров:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // =========================
  // SAVE TELEGRAM USER
  // =========================

  useEffect(() => {
    if (!telegramUser) return;

    const saveTelegramUser = async () => {
      try {
        const userRef = doc(
          db,
          "users",
          String(telegramUser.id)
        );

        const userSnapshot = await getDoc(userRef);

        const oldUserData = userSnapshot.exists()
          ? userSnapshot.data()
          : {};

        const userData = {
          telegramId: telegramUser.id,
          firstName: telegramUser.first_name || "",
          lastName: telegramUser.last_name || "",
          username: telegramUser.username || "",
          updatedAt: serverTimestamp(),
        };

        // Сохраняем существующую роль
        if (oldUserData.role) {
          userData.role = oldUserData.role;
        }

        // Новый пользователь
        if (!userSnapshot.exists()) {
          userData.role = "user";
          userData.createdAt = serverTimestamp();
        }

        // Сохраняем телефон
        if (oldUserData.phone) {
          userData.phone = oldUserData.phone;
          setPhone(oldUserData.phone);
        }

        await setDoc(userRef, userData, {
          merge: true,
        });

        console.log(
          "Telegram пользователь сохранён:",
          telegramUser.id
        );
      } catch (error) {
        console.error(
          "Ошибка сохранения пользователя:",
          error
        );
      }
    };

    saveTelegramUser();
  }, [telegramUser]);

  // =========================
  // CART
  // =========================

  const addToCart = (product) => {
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
  };

  const increaseQuantity = (productId) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  };

  const decreaseQuantity = (productId) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // =========================
  // CART TOTAL
  // =========================

  const cartCount = cart.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

  const cartTotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
        Number(item.quantity || 0),
    0
  );

  // =========================
  // FORMAT PRICE
  // =========================

  const formatPrice = (price) => {
    return `${Number(price || 0).toLocaleString(
      "ru-RU"
    )} сум`;
  };

  // =========================
  // GET LOCATION
  // =========================

  const getLocation = () => {
    setCheckoutError("");

    if (!navigator.geolocation) {
      setCheckoutError(
        "Ваш браузер не поддерживает геолокацию."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setLocation({
          latitude,
          longitude,
        });
      },
      (error) => {
        console.error(
          "Ошибка геолокации:",
          error
        );

        setCheckoutError(
          "Не удалось получить геолокацию. Разрешите доступ к местоположению."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // =========================
  // ORDER
  // =========================

  const handleOrder = async (event) => {
    event.preventDefault();

    setCheckoutError("");

    if (!telegramUser) {
      setCheckoutError(
        "Откройте Mini App через Telegram."
      );
      return;
    }

    if (cart.length === 0) {
      setCheckoutError("Корзина пуста.");
      return;
    }

    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();

    if (!cleanPhone) {
      setCheckoutError(
        "Введите номер телефона."
      );
      return;
    }

    if (!cleanAddress) {
      setCheckoutError(
        "Введите адрес доставки."
      );
      return;
    }

    setOrderLoading(true);

    try {
      // =========================
      // SAVE USER
      // =========================

      const userRef = doc(
        db,
        "users",
        String(telegramUser.id)
      );

      await setDoc(
        userRef,
        {
          telegramId: telegramUser.id,
          firstName:
            telegramUser.first_name || "",
          lastName:
            telegramUser.last_name || "",
          username:
            telegramUser.username || "",
          phone: cleanPhone,
          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      // =========================
      // ORDER ITEMS
      // =========================

      const orderItems = cart.map((item) => ({
        productId: item.id,
        name: item.name || "Товар",
        price: Number(item.price || 0),
        quantity: Number(
          item.quantity || 1
        ),
      }));

      // =========================
      // CUSTOMER NAME
      // =========================

      const customerName = [
        telegramUser.first_name || "",
        telegramUser.last_name || "",
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      // =========================
      // ORDER DATA
      // =========================

      const orderData = {
        customerName,

        phone: cleanPhone,

        address: cleanAddress,

        location: location
          ? {
              latitude: Number(
                location.latitude
              ),
              longitude: Number(
                location.longitude
              ),
            }
          : null,

        items: orderItems,

        totalPrice: Number(cartTotal),

        telegramId: telegramUser.id,

        userId: String(telegramUser.id),

        orderStatus: "pending",

        paymentStatus: "pending",

        createdAt: serverTimestamp(),
      };

      // =========================
      // CREATE ORDER
      // =========================

      const orderRef = await addDoc(
        collection(db, "orders"),
        orderData
      );

      console.log(
        "Заказ создан:",
        orderRef.id
      );

      // =========================
      // SUCCESS
      // =========================

      setOrderSuccess({
        orderId: orderRef.id,
        totalPrice: cartTotal,
      });

      clearCart();

      setShowCheckout(false);
      setShowCart(false);

      setAddress("");
      setLocation(null);
    } catch (error) {
      console.error(
        "Ошибка создания заказа:",
        error
      );

      if (
        error.code ===
        "permission-denied"
      ) {
        setCheckoutError(
          "Firestore запретил создание заказа. Проверьте Security Rules."
        );
      } else {
        setCheckoutError(
          "Не удалось оформить заказ. Попробуйте ещё раз."
        );
      }
    } finally {
      setOrderLoading(false);
    }
  };

  // =========================
  // OPEN CHECKOUT
  // =========================

  const openCheckout = () => {
    if (cart.length === 0) {
      return;
    }

    setCheckoutError("");
    setShowCheckout(true);
  };

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-icon">
          🌭
        </div>

        <p>Загрузка меню...</p>
      </div>
    );
  }

  // =========================
  // SUCCESS
  // =========================

  if (orderSuccess) {
    return (
      <div className="app">
        <div className="empty-cart">
          <div>✅</div>

          <h2>
            Заказ принят!
          </h2>

          <p>
            Спасибо за заказ
            {telegramUser?.first_name
              ? `, ${telegramUser.first_name}`
              : ""}
            !
          </p>

          <div
            style={{
              marginTop: "18px",
              color: "#777",
              fontSize: "13px",
            }}
          >
            Номер заказа:
          </div>

          <strong
            style={{
              display: "block",
              marginTop: "5px",
              fontSize: "18px",
            }}
          >
            #{orderSuccess.orderId.slice(-6)}
          </strong>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              marginTop: "18px",
              padding: "15px",
              background: "#f7f7f7",
              borderRadius: "15px",
            }}
          >
            <span>Сумма:</span>

            <strong>
              {formatPrice(
                orderSuccess.totalPrice
              )}
            </strong>
          </div>

          <button
            type="button"
            className="checkout-button"
            onClick={() =>
              setOrderSuccess(null)
            }
          >
            Вернуться к меню
          </button>
        </div>
      </div>
    );
  }

  // =========================
  // MAIN APP
  // =========================

  return (
    <div className="app">
      {/* HEADER */}

      <header className="header">
        <div className="logo">
          🌭
        </div>

        <div>
          <h1>Hot Dog</h1>

          <p>
            {telegramUser
              ? `Привет, ${
                  telegramUser.first_name ||
                  "гость"
                }!`
              : "Добро пожаловать!"}
          </p>
        </div>
      </header>

      {/* ADMIN BUTTON */}

      {telegramUser?.id && (
        <button
          type="button"
          className="back-to-admin-button"
          onClick={() => {
            const tg =
              window.Telegram?.WebApp;

            if (tg) {
              tg.close();
            }
          }}
        >
          ⚙️ Открыть админ-панель
        </button>
      )}

      {/* USER */}

      {telegramUser && (
        <div className="user-info">
          <div className="user-avatar">
            {(
              telegramUser.first_name ||
              "U"
            )
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <strong>
              {telegramUser.first_name ||
                "Пользователь"}

              {telegramUser.last_name
                ? ` ${telegramUser.last_name}`
                : ""}
            </strong>

            <span>
              {telegramUser.username
                ? `@${telegramUser.username}`
                : `ID: ${telegramUser.id}`}
            </span>
          </div>
        </div>
      )}

      {!telegramUser && (
        <div className="user-info">
          <div className="user-avatar">
            👤
          </div>

          <div>
            <strong>
              Гость
            </strong>

            <span>
              Откройте приложение через Telegram
            </span>
          </div>
        </div>
      )}

      {/* SECTION */}

      <div className="section-title">
        <h2>Меню</h2>

        <span>
          {products.length}{" "}
          {products.length === 1
            ? "товар"
            : "товаров"}
        </span>
      </div>

      {/* PRODUCTS */}

      <main className="products">
        {products.length === 0 ? (
          <div className="empty-cart">
            <div>🍔</div>

            <p>
              Пока нет товаров.
            </p>
          </div>
        ) : (
          products.map((product) => {
            const cartItem =
              cart.find(
                (item) =>
                  item.id === product.id
              );

            return (
              <article
                className="product-card"
                key={product.id}
              >
                <div className="product-image">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={
                        product.name ||
                        "Товар"
                      }
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius:
                          "16px",
                      }}
                    />
                  ) : (
                    "🌭"
                  )}
                </div>

                <div className="product-content">
                  <h2>
                    {product.name ||
                      "Без названия"}
                  </h2>

                  <p>
                    {product.description ||
                      "Вкусный хот-дог"}
                  </p>

                  <div className="product-bottom">
                    <strong>
                      {formatPrice(
                        product.price
                      )}
                    </strong>

                    {cartItem ? (
                      <div className="quantity-control">
                        <button
                          type="button"
                          onClick={() =>
                            decreaseQuantity(
                              product.id
                            )
                          }
                        >
                          −
                        </button>

                        <span>
                          {
                            cartItem.quantity
                          }
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            increaseQuantity(
                              product.id
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="add-button"
                        onClick={() =>
                          addToCart(product)
                        }
                      >
                        Добавить
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </main>

      {/* CART BAR */}

      {cart.length > 0 && (
        <button
          type="button"
          className="cart-bar"
          onClick={() =>
            setShowCart(true)
          }
        >
          <div>
            <span className="cart-count">
              {cartCount}
            </span>

            <strong>
              Открыть корзину
            </strong>
          </div>

          <strong>
            {formatPrice(cartTotal)}
          </strong>
        </button>
      )}

      {/* CART */}

      {showCart && (
        <div
          className="cart-overlay"
          onClick={() =>
            setShowCart(false)
          }
        >
          <div
            className="cart-sheet"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="cart-header">
              <h2>
                Корзина
              </h2>

              <button
                type="button"
                className="close-cart"
                onClick={() =>
                  setShowCart(false)
                }
              >
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <div>🛒</div>

                <p>
                  Корзина пуста
                </p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div
                      className="cart-item"
                      key={item.id}
                    >
                      <div className="cart-item-image">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={
                              item.name ||
                              "Товар"
                            }
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit:
                                "cover",
                              borderRadius:
                                "13px",
                            }}
                          />
                        ) : (
                          "🌭"
                        )}
                      </div>

                      <div className="cart-item-info">
                        <strong>
                          {item.name}
                        </strong>

                        <span>
                          {formatPrice(
                            item.price
                          )}
                        </span>

                        <div className="cart-quantity">
                          <button
                            type="button"
                            onClick={() =>
                              decreaseQuantity(
                                item.id
                              )
                            }
                          >
                            −
                          </button>

                          <span>
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              increaseQuantity(
                                item.id
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <strong className="cart-item-total">
                        {formatPrice(
                          Number(
                            item.price || 0
                          ) *
                            Number(
                              item.quantity ||
                                0
                            )
                        )}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="cart-total">
                  <span>
                    Итого
                  </span>

                  <strong>
                    {formatPrice(
                      cartTotal
                    )}
                  </strong>
                </div>

                <button
                  type="button"
                  className="checkout-button"
                  onClick={
                    openCheckout
                  }
                >
                  Оформить заказ
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT */}

      {showCheckout && (
        <div
          className="cart-overlay"
          onClick={() =>
            setShowCheckout(false)
          }
        >
          <div
            className="cart-sheet"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="cart-header">
              <h2>
                Оформление
              </h2>

              <button
                type="button"
                className="close-cart"
                onClick={() =>
                  setShowCheckout(false)
                }
              >
                ×
              </button>
            </div>

            {/* USER */}

            {telegramUser && (
              <div className="user-info">
                <div className="user-avatar">
                  {(
                    telegramUser.first_name ||
                    "U"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <strong>
                    {telegramUser.first_name ||
                      ""}

                    {telegramUser.last_name
                      ? ` ${telegramUser.last_name}`
                      : ""}
                  </strong>

                  <span>
                    {telegramUser.username
                      ? `@${telegramUser.username}`
                      : `ID: ${telegramUser.id}`}
                  </span>
                </div>
              </div>
            )}

            <form
              onSubmit={handleOrder}
            >
              {/* PHONE */}

              <label
                style={{
                  display: "block",
                  marginBottom: "7px",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                Телефон
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value
                  )
                }
                placeholder="+998 90 123 45 67"
                required
                style={{
                  width: "100%",
                  padding: "13px",
                  border:
                    "1px solid #e5e5e5",
                  borderRadius: "12px",
                  outline: "none",
                  fontFamily:
                    "inherit",
                  fontSize: "14px",
                  marginBottom:
                    "14px",
                }}
              />

              {/* ADDRESS */}

              <label
                style={{
                  display: "block",
                  marginBottom: "7px",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                Адрес доставки
              </label>

              <textarea
                value={address}
                onChange={(event) =>
                  setAddress(
                    event.target.value
                  )
                }
                placeholder="Введите адрес доставки"
                rows="3"
                required
                style={{
                  width: "100%",
                  padding: "13px",
                  border:
                    "1px solid #e5e5e5",
                  borderRadius: "12px",
                  outline: "none",
                  resize: "vertical",
                  fontFamily:
                    "inherit",
                  fontSize: "14px",
                  marginBottom:
                    "14px",
                }}
              />

              {/* LOCATION */}

              <div
                style={{
                  padding: "14px",
                  background:
                    "#f7f7f7",
                  borderRadius: "15px",
                  marginBottom:
                    "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    gap: "10px",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        display:
                          "block",
                        fontSize:
                          "14px",
                      }}
                    >
                      📍 Геолокация
                    </strong>

                    <span
                      style={{
                        display:
                          "block",
                        marginTop:
                          "4px",
                        color:
                          "#777",
                        fontSize:
                          "12px",
                      }}
                    >
                      {location
                        ? "Местоположение получено"
                        : "Местоположение не получено"}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="add-button"
                    onClick={
                      getLocation
                    }
                  >
                    {location
                      ? "Обновить"
                      : "Получить"}
                  </button>
                </div>
              </div>

              {/* ERROR */}

              {checkoutError && (
                <div
                  style={{
                    padding:
                      "12px",
                    marginBottom:
                      "14px",
                    borderRadius:
                      "12px",
                    background:
                      "#ffe5e5",
                    color:
                      "#c62828",
                    fontSize:
                      "13px",
                  }}
                >
                  {checkoutError}
                </div>
              )}

              {/* TOTAL */}

              <div className="cart-total">
                <span>
                  К оплате
                </span>

                <strong>
                  {formatPrice(
                    cartTotal
                  )}
                </strong>
              </div>

              {/* SUBMIT */}

              <button
                type="submit"
                className="checkout-button"
                disabled={
                  orderLoading
                }
                style={{
                  opacity:
                    orderLoading
                      ? 0.6
                      : 1,
                }}
              >
                {orderLoading
                  ? "Оформление..."
                  : "Подтвердить заказ"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

