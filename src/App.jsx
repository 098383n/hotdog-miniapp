
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase/config";

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [telegramUser, setTelegramUser] = useState(null);

  useEffect(() => {
    // Получаем Telegram WebApp
    const tg = window.Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand();

      // Получаем информацию о пользователе Telegram
      const user = tg.initDataUnsafe?.user;

      if (user) {
        setTelegramUser(user);

        console.log("Telegram user:", user);
      }
    }

    // Загружаем товары из Firebase
    async function loadProducts() {
      try {
        const snapshot = await getDocs(collection(db, "products"));

        const productsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProducts(productsList);
      } catch (error) {
        console.error("Ошибка загрузки товаров:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  if (loading) {
    return <h1>Загрузка...</h1>;
  }

  return (
    <div>
      <h1>🍔 Hot-Dog Menu</h1>

      {telegramUser && (
        <div>
          <p>
            Привет, {telegramUser.first_name}! 👋
          </p>

          <p>
            Telegram ID: {telegramUser.id}
          </p>
        </div>
      )}

      {products.map((product) => (
        <div key={product.id}>
          <h2>{product.name}</h2>

          <p>{product.description}</p>

          <p>
            {product.price.toLocaleString()} сум
          </p>
        </div>
      ))}
    </div>
  );
}

export default App;

