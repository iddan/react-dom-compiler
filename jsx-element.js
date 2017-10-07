const JSX_ATTRIBUTE_NAME_MAPPINGS = {
  className: 'class',
  htmlFor: 'for',
};

const getName = exports.getName = jsxElement => jsxElement.openingElement.name.name;

const getAttributes = exports.getAttributes = jsxElement => jsxElement.openingElement.attributes.map(attribute => {
  const mappedName = JSX_ATTRIBUTE_NAME_MAPPINGS[attribute.name.name];
  if (mappedName) {
    return {
      ...attribute,
      name: {
        ...attribute.name,
        name: mappedName,
      },
    };
  }
  return attribute;
});

const isDOMElement = exports.isDOMElement = jsxElement => Boolean(getName(jsxElement).match(/[a-z]/));
