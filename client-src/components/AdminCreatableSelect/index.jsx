import React from "react";
import CreatableSelect from 'react-select/creatable';

export default function AdminCreatableSelect(
  { label, value, options, onChange, extraParams, labelComponent = null }) {
  return (<label className="">
    {label && <div className="lh-page-subtitle">{label}</div>}
    {labelComponent}
    <div className="w-full">
      <CreatableSelect
        styles={{
          control: (baseStyles, state) => ({
            ...baseStyles,
            borderColor: state.isFocused ? 'grey' : 'black',
            borderRadius: 4,
          }),
        }}
        className="text-sm"
        value={value}
        options={options}
        onChange={onChange}
        {...extraParams}
      />
    </div>
  </label>);
}
