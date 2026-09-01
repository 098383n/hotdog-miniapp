import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase/config";

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("APP STARTED");

    const tg = window.Telegram?.WebApp;

    console.log("Telegram:", tg);

    if (tg) {
      tg.ready();
      tg.expand();

      console.log("Telegram user:", tg.initDataUnsafe?.user);
    }

    async function loadProducts() {
      try {
        console.log("Loading Firebase...");

        const snapshot = await getDocs(
          collection(db, "products")
        );

        console.log("Firebase documents:", snapshot.docs.length);

        const productsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProducts(productsList);
      } catch (error) {
        console.error("FIREBASE ERROR:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  if (loading) {
    return (
      <div>
        <h1>Загрузка...</h1>
      </div>
    );
  }

  return (
    <div>
      <h1>🍔 Hot-Dog Menu</h1>

      {products.length === 0 && (
        <p>Товаров пока нет</p>
      )}

      {products.map((product) => (
        <div key={product.id}>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <p>
            {Number(product.price || 0).toLocaleString()} сум
          </p>
        </div>
      ))}
    </div>
  );
}

export default App;