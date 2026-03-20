import React from 'react';
import { X } from 'lucide-react';
import { CartItem as CartItemType } from '../../context/CartContext';

interface Props {
  item: CartItemType;
  onRemove: (id: string) => void;
}

const CartItem: React.FC<Props> = ({ item, onRemove }) => {
  return (
    <div className="border-b border-black py-6 flex justify-between items-start gap-4">
      <div className="flex-1">
        <h4 className="text-xl font-bold tracking-tighter">{item.name}</h4>
        <div className="text-[10px] tracking-widest text-gray-500 mt-1 uppercase">
          {item.tier} Tier — {item.usages.join(', ')}
          {item.webTierLabel && ` (${item.webTierLabel} views)`}
        </div>
      </div>
      <div className="text-right">
        <div className="text-xl font-normal tracking-tighter">${item.price}</div>
        <button onClick={() => onRemove(item.cartId)} className="text-[10px] font-bold underline mt-2 hover:text-red-600 uppercase">
          Remove
        </button>
      </div>
    </div>
  );
};

export default CartItem;