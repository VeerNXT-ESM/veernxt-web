import React from 'react';
import Select from 'react-select';
import { ChevronDown } from 'lucide-react';

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'var(--ios-secondary, #f5f5f7)',
    border: state.isFocused ? '1px solid var(--ios-olive, #4b6b32)' : '1px solid #eee',
    borderRadius: '12px',
    padding: '0.2rem',
    boxShadow: state.isFocused ? '0 0 0 1px var(--ios-olive, #4b6b32)' : 'none',
    '&:hover': {
      border: '1px solid var(--ios-olive, #4b6b32)',
    },
    minHeight: '44px',
    cursor: 'pointer',
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0 0.5rem',
  }),
  input: (provided) => ({
    ...provided,
    margin: '0',
    padding: '0',
    color: '#333',
    fontFamily: 'inherit',
    fontSize: '0.95rem',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#999',
    fontSize: '0.95rem',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#333',
    fontSize: '0.95rem',
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: '12px',
    marginTop: '4px',
    padding: '0.5rem',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    border: '1px solid #eee',
    zIndex: 9999,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: '0',
    '::-webkit-scrollbar': {
      width: '6px',
    },
    '::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '::-webkit-scrollbar-thumb': {
      background: '#ddd',
      borderRadius: '3px',
    },
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected 
      ? 'var(--ios-olive, #4b6b32)' 
      : state.isFocused 
        ? 'rgba(75, 107, 50, 0.1)' 
        : 'transparent',
    color: state.isSelected ? 'white' : '#333',
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    marginBottom: '2px',
    '&:active': {
      backgroundColor: 'var(--ios-olive, #4b6b32)',
      color: 'white',
    },
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: '0 0.5rem',
    color: '#999',
  }),
};

const DropdownIndicator = (props) => {
  return (
    <div {...props.innerProps} style={{ padding: '0 8px', display: 'flex', alignItems: 'center' }}>
      <ChevronDown size={18} color={props.isFocused ? 'var(--ios-olive, #4b6b32)' : '#999'} />
    </div>
  );
};

export default function PremiumSelect({ options, value, onChange, placeholder, disabled, name }) {
  const selectedOption = options.find(opt => opt.value === value) || null;

  const handleChange = (selected) => {
    const event = {
      target: {
        name: name,
        value: selected ? selected.value : '',
        type: 'select-one'
      }
    };
    onChange(event);
  };

  return (
    <Select
      value={selectedOption}
      onChange={handleChange}
      options={options}
      styles={customStyles}
      placeholder={placeholder || "Select..."}
      isDisabled={disabled}
      components={{ DropdownIndicator }}
      isClearable={false}
      isSearchable={true}
      menuPlacement="auto"
    />
  );
}
