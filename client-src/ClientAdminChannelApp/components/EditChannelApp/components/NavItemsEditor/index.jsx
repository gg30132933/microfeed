import React from 'react';
import clsx from "clsx";
import { PlusCircleIcon, TrashIcon, ArrowSmallUpIcon, ArrowSmallDownIcon } from '@heroicons/react/24/outline';
import AdminInput from "../../../../../components/AdminInput";
import {randomShortUUID} from "../../../../../../common-src/StringUtils";

function NavItemRow({navItem, index, firstIndex, lastIndex, updateItem, moveItem, removeItem}) {
  const {id, label, url} = navItem;
  return (<div className={clsx('flex py-4 border-b')}>
    <div className="flex-none mr-2 flex items-center justify-start">
      <button
        type="button"
        className={firstIndex ? 'text-muted-color' : 'hover:opacity-50'}
        disabled={firstIndex}
        onClick={(e) => moveItem(e, index, index - 1)}
      >
        <ArrowSmallUpIcon className="w-4" />
      </button>
      <button
        type="button"
        className={clsx(lastIndex ? 'text-muted-color' : 'hover:opacity-50')}
        disabled={lastIndex}
        onClick={(e) => moveItem(e, index, index + 1)}
      >
        <ArrowSmallDownIcon className="w-4" />
      </button>
    </div>
    <div className="flex-1 grid grid-cols-12 gap-2">
      <div className="col-span-4">
        <AdminInput
          value={label}
          placeholder="Label"
          onChange={(e) => updateItem(id, 'label', e.target.value)}
          customClass="text-xs p-1"
        />
      </div>
      <div className="col-span-8">
        <AdminInput
          value={url}
          placeholder="https://..."
          onChange={(e) => updateItem(id, 'url', e.target.value)}
          customClass="text-xs p-1"
        />
      </div>
    </div>
    <div className="flex-none ml-2 flex items-center">
      <a
        href="#"
        className="text-red-500"
        onClick={(e) => {
          e.preventDefault();
          removeItem(id);
        }}
      >
        <TrashIcon className="w-4" />
      </a>
    </div>
  </div>);
}

export default function NavItemsEditor({navItems, onChange}) {
  const items = navItems || [];

  function updateItem(id, attrName, attrValue) {
    onChange(items.map((navItem) => (
      navItem.id === id ? {...navItem, [attrName]: attrValue} : navItem
    )));
  }

  function moveItem(e, oldIndex, newIndex) {
    e.preventDefault();
    const newItems = [...items];
    const element = newItems.splice(oldIndex, 1)[0];
    newItems.splice(newIndex, 0, element);
    onChange(newItems);
  }

  function removeItem(id) {
    onChange(items.filter((navItem) => navItem.id !== id));
  }

  function addItem() {
    onChange([...items, {id: randomShortUUID(), label: '', url: ''}]);
  }

  return (<div>
    <div className="lh-page-subtitle">Navigation menu</div>
    <div className="text-muted-color text-xs mb-2">
      Extra links shown in the site's nav bar, e.g. "About", "Services".
    </div>
    <div>
      {items.map((navItem, i) => <NavItemRow
        key={navItem.id}
        navItem={navItem}
        index={i}
        firstIndex={i === 0}
        lastIndex={i === items.length - 1}
        updateItem={updateItem}
        moveItem={moveItem}
        removeItem={removeItem}
      />)}
    </div>
    <div className="mt-2">
      <a href="#" onClick={(e) => {e.preventDefault(); addItem();}}>
        <div className="flex items-center justify-center">
          <div className="w-4 mr-1"><PlusCircleIcon/></div>
          <div>Add menu item</div>
        </div>
      </a>
    </div>
  </div>);
}
