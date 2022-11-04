export const processAjvErrors = (ajvErrors) => {
  return ajvErrors.reduce((acc, current) => {
    const fieldName = current.instancePath
      ? current.instancePath.slice(1, current.instancePath.length)
      : current.params?.missingProperty;

    return {
      ...acc,
      [fieldName]: current.message,
    };
  }, {});
};

export const unflatten = (data, splitOperator) => {
  var result = {};
  for (var i in data) {
    var keys = i.split(splitOperator);
    keys.reduce(function (r, e, j) {
      return (
        r[e] ||
        (r[e] = isNaN(Number(keys[j + 1]))
          ? keys.length - 1 === j
            ? data[i]
            : {}
          : [])
      );
    }, result);
  }
  return result;
};

export const getValue = (state, fieldName) => {
  if (typeof state[fieldName] === 'boolean') {
    return state[fieldName];
  }

  if (state[fieldName]) {
    return state[fieldName];
  }

  return '';
};

export const flattenObj = (ob) => {
  let result = {};
  for (const i in ob) {
    if (typeof ob[i] === 'object') {
      const temp = flattenObj(ob[i]);
      for (const j in temp) {
        result[i + '.' + j] = temp[j];
      }
    } else {
      result[i] = ob[i];
    }
  }
  return result;
};

export const getInitialState = (initialState: any) => {
  const flattened = flattenObj(initialState);

  return Object.keys(flattened).reduce((acc, fieldName) => {
    acc[fieldName] = {
      value: getValue(flattened, fieldName),
      error: null,
    };

    return acc;
  }, {});
};
