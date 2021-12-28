import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get<Product>(`/products/${productId}`);
      const amountData = await api.get<UpdateProductAmount>(
        `/stock/${productId}`
      );
      const stockData = amountData.data;
      const product = response.data;
      const updatedCart = [...cart];
      const productInCart = updatedCart.find((p) => p.id === product.id);
      const currentAmount = productInCart ? productInCart.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stockData.amount) {
        toast.error(`Quantidade solicitada fora de estoque`);
        return;
      }

      if (productInCart) {
        productInCart.amount = amount;
      } else {
        const newProduct = { ...product, amount: 1 };
        updatedCart.push(newProduct);
      }
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex((p) => p.id === productId);
      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
      } else {
        throw Error();
      }
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const stock = await api.get<UpdateProductAmount>(`/stock/${productId}`);
      const amountData = stock.data.amount;
      if (amount > amountData) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      const updatedCart = [...cart];
      const productExists = updatedCart.find((p) => p.id === productId);

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
      } else {
        throw Error("Produto não encontrado");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
