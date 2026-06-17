const phraseTypes = {
  IDENTIFIER: "identifier",
  ATTRIBUTE: "attribute",
  HTML: "html",
  SLOT: "slot",
  COMPONENT: "component",
};

const INVALID_ARRAY_ITEM =
  "[helix] Each item in an array must be a template. Create one like this: html(key)`...`";
const MISSING_ARRAY_ITEM_KEY =
  "[helix] Each template in an array must have a key. Pass one like this: html(key)`...`";

const DEBUG = true;

function debug(...msg) {
  DEBUG && console.log(...msg);
}

function isValidKey(key) {
  return (
    (typeof key === "string" && key.trim()) ||
    (typeof key === "number" && !isNaN(key))
  );
}

function isTemplate(value) {
  return value && value._isTemplateNode;
}

function isTemplateMatch(a, b) {
  if (!a.hash && !b.hash) {
    return a === b;
  }
  return a.hash === b.hash;
}

function isInterpolationsMatch(a, b) {
  return (
    a.interpolations.length === b.interpolations.length &&
    a.interpolations.every(
      (value, i) => isPrimitive(value) && b.interpolations[i] === value,
    )
  );
}

function isPrimitive(value) {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  );
}

function canRenderPrimitive(value) {
  return typeof value === "string" || typeof value === "number";
}

function isPlainObject(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

/**
 * Intentionally counts "" as truthy since that is used to indicate an
 * attribute value of true in html
 */
function isHtmlTruthy(value) {
  if (value === false || value === undefined || value === null) {
    return false;
  }
  return true;
}

function isMergeable(phrase) {
  return phrase && phrase.type === phraseTypes.HTML;
}

function mergePhrases(phrases) {
  return phrases.reduce((acc, phrase) => {
    if (!acc.length) {
      return [phrase];
    } else {
      const prev = acc.at(-1);

      if (isMergeable(prev) && isMergeable(phrase)) {
        return [
          ...acc.slice(0, -1),
          { ...prev, value: prev.value + phrase.value },
        ];
      } else {
        return [...acc, phrase];
      }
    }
  }, []);
}

function resolveComponents(module) {
  const templates = [];
  const components = {};

  Object.entries(module).forEach(([name, value]) => {
    if (isTemplate(value)) {
      templates.push(value);
    } else if (typeof value === "function" && /[A-Z]/.test(name)) {
      components[name] = value;
    } else if (
      /[A-Z]/.test(name) &&
      value &&
      typeof value === "object" &&
      value[Symbol.toStringTag] === "Module" &&
      typeof value[name] === "function"
    ) {
      components[name] = value[name];
      components[name].components = resolveComponents(value);
    }
  });

  // TODO: re-exported templates may end up with the wrong components
  templates.forEach((template) => (template.components = components));
  Object.values(components).forEach(
    (component) => (component.components ||= components),
  );

  return components;
}

export function createRoot(domNode, scope) {
  const components = resolveComponents(scope);

  return {
    render(template) {
      template.components = components;

      const result = renderToString("root", template);
      domNode.innerHTML = result.html;

      hydrate("root", result);

      while (deferredTasks.length) {
        deferredTasks.shift()();
      }
    },
  };
}

const codeLookup = {
  "&": "&amp;",
  "<": "&lt;",
  '"': "&quot;",
  "'": "&#39;",
  ">": "&gt;",
};

function escapeHtml(text) {
  if (typeof text !== "string") {
    return text;
  }

  return text.replace(/&|<|"|'|>/g, (match) => codeLookup[match]);
}

export function html(htmlStringsOrConfig, ...interpolations) {
  if (Array.isArray(htmlStringsOrConfig)) {
    const strings = htmlStringsOrConfig;
    return getTemplateBuilder(undefined, strings, ...interpolations)();
  } else if (
    typeof htmlStringsOrConfig === "string" ||
    typeof htmlStringsOrConfig === "number"
  ) {
    const key = htmlStringsOrConfig;
    return getTemplateBuilder(key);
  } else {
    const config = htmlStringsOrConfig;
    return getTemplateBuilder(config.key);
  }
}

// TODO: figure out how to make templates cacheable
function getTemplateBuilder(key, defaultHtmlStrings, ...defaultInterpolations) {
  return (htmlStrings, ...interpolations) => {
    const htmlStringsWithDefaults = [...(htmlStrings || defaultHtmlStrings)];

    return {
      _isTemplateNode: true,
      // TODO: you need to escape dots and hashes in keys
      // - prefixing is not enough
      // - might be best to avoid storing array keys in the dom at all
      assignedkey: isValidKey(key) ? "i_" + key : undefined,
      // NOTE: when determining dom changes, object equality can be used
      // instead of a hash for templates created when parsing component
      // children
      hash: htmlStringsWithDefaults.join("_"),
      interpolations: interpolations.length
        ? interpolations
        : defaultInterpolations,
      htmlStrings: htmlStringsWithDefaults,
      parsedHtmlPhrases: [],
      identifiers: [],
      slots: [],
      attributes: [],
      listeners: [],
      props: [],
    };
  };
}

// TODO: trim inter-element whitespace

function parseTemplateInPlace(template) {
  let isOpeningTag = false;
  let isClosingTag = false;
  let isComponentTag = false;
  let isAttr = false;
  let suffix = 0;

  const templateStack = [template];

  function pushPhrase(phrase) {
    templateStack.at(-1).parsedHtmlPhrases.push(phrase);
  }

  function getIdentifiers() {
    return templateStack.at(-1).identifiers;
  }

  template.htmlStrings.forEach((fragment, i) => {
    // Add a closing identifier for slots
    if (!isOpeningTag && !isClosingTag && i !== 0) {
      pushPhrase({
        type: phraseTypes.IDENTIFIER,
        index: getIdentifiers().length - 1,
      });
    }

    let unparsedFragment = fragment;

    while (unparsedFragment.length) {
      const specialCharsIndex = unparsedFragment.split("").findIndex(
        (char, i) =>
          // Opening tag start
          (!isOpeningTag &&
            !isAttr &&
            char === "<" &&
            unparsedFragment[i + 1] !== "/") ||
          // Attribute start or end
          (isOpeningTag && char === '"') ||
          // Closing tag start
          (templateStack.length > 1 &&
            !isOpeningTag &&
            !isAttr &&
            char === "<" &&
            unparsedFragment[i + 1] === "/") ||
          // Tag end
          (((isOpeningTag && !isAttr) || isClosingTag) && char === ">"),
      );

      const specialChars =
        specialCharsIndex < 0
          ? undefined
          : unparsedFragment[specialCharsIndex] === "<" &&
              unparsedFragment[specialCharsIndex + 1] === "/"
            ? "</"
            : unparsedFragment[specialCharsIndex];

      if (!specialChars) {
        break;
      }

      switch (specialChars) {
        // Handle tag start
        case "<":
          if (specialCharsIndex !== 0) {
            pushPhrase({
              type: phraseTypes.HTML,
              value: unparsedFragment.slice(0, specialCharsIndex),
            });
          }

          if (/[A-Z]/.test(unparsedFragment[specialCharsIndex + 1])) {
            isComponentTag = true;
            getIdentifiers().push({ suffix });
            suffix++;

            pushPhrase({
              type: phraseTypes.IDENTIFIER,
              index: getIdentifiers().length - 1,
            });

            pushPhrase({
              type: phraseTypes.COMPONENT,
              tagStart: true,
              tagName: unparsedFragment.slice(
                specialCharsIndex + 1,
                specialCharsIndex +
                  1 +
                  unparsedFragment
                    .slice(specialCharsIndex + 1)
                    .split("")
                    // TODO: figure out what characters should be allowed in
                    // component names
                    .findIndex((char) => !/[a-z0-9]/i.test(char)),
              ),
            });
          } else {
            pushPhrase({ type: phraseTypes.HTML, tagStart: true, value: "<" });
          }

          isOpeningTag = true;
          break;
        // Handle non-interpolated attribute start/end
        case '"':
          if (!isComponentTag) {
            pushPhrase({
              type: phraseTypes.HTML,
              value: unparsedFragment.slice(0, specialCharsIndex + 1),
            });
          } else if (!isAttr) {
            const name = unparsedFragment.slice(
              unparsedFragment
                .slice(0, specialCharsIndex - 1)
                .lastIndexOf(" ") + 1,
              specialCharsIndex - 1,
            );

            const value = unparsedFragment.slice(
              specialCharsIndex + 1,
              specialCharsIndex +
                1 +
                unparsedFragment.slice(specialCharsIndex + 1).indexOf('"'),
            );

            templateStack.at(-1).props.push({
              identifierIndex: getIdentifiers().length - 1,
              name,
              value,
            });
          }

          isAttr = !isAttr;
          break;
        // Handle closing tag start
        case "</":
          if (/[A-Z]/.test(unparsedFragment[specialCharsIndex + 2])) {
            isComponentTag = true;
          }

          pushPhrase({
            type: phraseTypes.HTML,
            value: unparsedFragment.slice(
              0,
              isComponentTag ? specialCharsIndex : specialCharsIndex + 2,
            ),
          });

          if (isComponentTag) {
            templateStack.at(-1).parsedHtmlPhrases = mergePhrases(
              templateStack.at(-1).parsedHtmlPhrases,
            );
            templateStack.pop();
          }

          isClosingTag = true;
          break;
        // Handle tag end
        case ">":
          if (!isComponentTag) {
            // TODO: handle self closing tags
            pushPhrase({
              type: phraseTypes.HTML,
              value: unparsedFragment.slice(0, specialCharsIndex + 1),
            });
          } else if (
            isOpeningTag &&
            unparsedFragment[specialCharsIndex - 1] !== "/"
          ) {
            templateStack.at(-1).props.push({
              identifierIndex: getIdentifiers().length - 1,
              name: "children",
              value: {
                _isTemplateNode: true,
                interpolations: templateStack.at(-1).interpolations,
                parsedHtmlPhrases: [],
                identifiers: [],
                attributes: [],
                listeners: [],
                slots: [],
                props: [],
              },
            });

            templateStack.push(templateStack.at(-1).props.at(-1).value);
          } else if (
            isClosingTag ||
            unparsedFragment[specialCharsIndex - 1] === "/"
          ) {
            pushPhrase({
              type: phraseTypes.IDENTIFIER,
              index: getIdentifiers().length - 1,
            });
          }

          isClosingTag = false;
          isOpeningTag = false;
          isComponentTag = false;
          break;
      }

      unparsedFragment = unparsedFragment.slice(
        specialCharsIndex + specialChars.length,
      );
    }

    // Handle interpolated component props
    if (isComponentTag && isOpeningTag && fragment.endsWith("=")) {
      templateStack.at(-1).props.push({
        identifierIndex: getIdentifiers().length - 1,
        name: fragment.slice(fragment.lastIndexOf(" ") + 1, -1),
        interpolationIndex: i,
      });
    }
    // Handle interpolated attributes and inline event listeners
    else if (
      isOpeningTag &&
      !isComponentTag &&
      unparsedFragment.endsWith("=")
    ) {
      const phrases = templateStack.at(-1).parsedHtmlPhrases;
      const tagStart = phrases.findLastIndex((phrase) => phrase.tagStart);

      if (
        !phrases[tagStart - 1] ||
        phrases[tagStart - 1].type !== phraseTypes.IDENTIFIER
      ) {
        getIdentifiers().push({ suffix });
        suffix++;

        phrases.splice(tagStart, 0, {
          type: phraseTypes.IDENTIFIER,
          index: getIdentifiers().length - 1,
        });
      }

      const attrStart = unparsedFragment.lastIndexOf(" ") + 1;
      const attrName = unparsedFragment.slice(attrStart, -1);

      pushPhrase({
        type: phraseTypes.HTML,
        value: unparsedFragment.slice(0, attrStart),
      });

      if (attrName.startsWith("on")) {
        getIdentifiers().at(-1).hasEvent = true;

        templateStack.at(-1).listeners.push({
          interpolationIndex: i,
          event: attrName.slice(2).toLowerCase(),
          identifierIndex: getIdentifiers().length - 1,
        });
      } else {
        templateStack.at(-1).attributes.push({
          name: attrName,
          interpolationIndex: i,
          identifierIndex: getIdentifiers().length - 1,
        });

        pushPhrase({
          type: phraseTypes.ATTRIBUTE,
          index: templateStack.at(-1).attributes.length - 1,
        });
      }
    }
    // Handle slots
    else if (
      !isOpeningTag &&
      !isClosingTag &&
      i !== template.htmlStrings.length - 1
    ) {
      pushPhrase({ type: phraseTypes.HTML, value: unparsedFragment });

      getIdentifiers().push({ suffix });
      suffix++;

      pushPhrase({
        type: phraseTypes.IDENTIFIER,
        index: getIdentifiers().length - 1,
      });

      templateStack.at(-1).slots.push({
        interpolationIndex: i,
        identifierIndex: getIdentifiers().length - 1,
      });

      pushPhrase({
        type: phraseTypes.SLOT,
        index: templateStack.at(-1).slots.length - 1,
      });
    } else {
      pushPhrase({ type: phraseTypes.HTML, value: unparsedFragment });
    }
  });

  template.parsedHtmlPhrases = mergePhrases(template.parsedHtmlPhrases);
}

const renderStack = [];

const templatesByKey = {};
const componentsByKey = {};

let propsByKey = {};

function renderToString(key, node, result = { html: "", listenersByKey: {} }) {
  let template;
  if (isTemplate(node)) {
    template = node;
  } else {
    componentsByKey[key] = node;

    renderStack.push({
      type: "component",
      key,
      onUpdate: () => render(key, node),
    });

    template = node(propsByKey[key] || {});
    renderStack.pop();
  }

  if (isPrimitive(template)) {
    if (canRenderPrimitive(template)) {
      result.html += escapeHtml(template);
    }

    return result;
  }

  if (!template.parsedHtmlPhrases.length) {
    parseTemplateInPlace(template);
  }

  template.components ||= node.components;
  templatesByKey[key] = template;

  template.parsedHtmlPhrases.forEach((phrase, i) => {
    const prevPhrase = template.parsedHtmlPhrases[i - 1];
    const activeKey =
      prevPhrase?.type === phraseTypes.IDENTIFIER &&
      key + "." + template.identifiers[prevPhrase.index].suffix;

    switch (phrase.type) {
      case phraseTypes.IDENTIFIER:
        {
          const identifier = template.identifiers[phrase.index];

          result.html += `<!-- ${identifier.hasEvent ? "evt " : ""}${
            key + "." + identifier.suffix
          } -->`;
        }
        break;
      case phraseTypes.HTML:
        result.html += phrase.value;
        break;
      case phraseTypes.ATTRIBUTE:
        {
          const attribute = template.attributes[phrase.index];
          const value = template.interpolations[attribute.interpolationIndex];

          if (value === true) {
            // Including only the name is the proper way to indicate an
            // attribute value of true in html
            result.html += attribute.name;
          } else if (
            isHtmlTruthy(value) &&
            // Don't include inline event listeners as those are attached with
            // addEventListener
            !attribute.name.startsWith("on")
          ) {
            result.html += `${attribute.name}="${escapeHtml(value)}"`;
          }
        }
        break;
      case phraseTypes.SLOT:
        {
          const value =
            template.interpolations[
              template.slots[phrase.index].interpolationIndex
            ];

          if (isPrimitive(value)) {
            if (canRenderPrimitive(value)) {
              result.html += escapeHtml(value);
            }
          } else if (isTemplate(value)) {
            value.components ||= template.components;

            renderToString(activeKey, value, result);
          } else if (Array.isArray(value)) {
            if (!value.every(isTemplate)) {
              throw new Error(INVALID_ARRAY_ITEM);
            }

            if (!value.every((item) => isValidKey(item.assignedkey))) {
              throw new Error(MISSING_ARRAY_ITEM_KEY);
            }

            value.forEach((item) => {
              const itemKey = activeKey + "." + item.assignedkey;

              item.components ||= template.components;

              result.html += `<!-- ${itemKey} -->`;
              renderToString(itemKey, item, result);
              result.html += `<!-- ${itemKey} -->`;
            });
          }
        }
        break;
      case phraseTypes.COMPONENT:
        if (
          phrase.tagName in template.components &&
          typeof template.components[phrase.tagName] === "function"
        ) {
          propsByKey[activeKey] = Object.fromEntries(
            template.props.flatMap((prop) =>
              template.identifiers[prop.identifierIndex] ===
              template.identifiers[prevPhrase.index]
                ? [
                    [
                      prop.name,
                      prop.name === "children" && isTemplate(prop.value)
                        ? {
                            ...prop.value,
                            components:
                              prop.value.components || node.components,
                          }
                        : prop.value ||
                          template.interpolations[prop.interpolationIndex],
                    ],
                  ]
                : [],
            ),
          );

          renderToString(
            activeKey,
            template.components[phrase.tagName],
            result,
          );
        } else {
          throw new Error(`[helix] Component "${phrase.tagName}" not found`);
        }
        break;
    }
  });

  // Keep track of listeners so they can be attached after the dom is updated
  template.listeners.forEach((listener) => {
    const listenerKey =
      key + "." + template.identifiers[listener.identifierIndex].suffix;

    result.listenersByKey[listenerKey] ||= [];
    result.listenersByKey[listenerKey].push({
      event: listener.event,
      handler: template.interpolations[listener.interpolationIndex],
    });
  });

  return result;
}

const elementsByKey = {};

function getElementByKey(key) {
  const el = (elementsByKey[key] ||= document.evaluate(
    `//comment()[contains(string(), " ${key} ")]`,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
  ).singleNodeValue?.nextSibling);

  if (!el.isConnected) {
    throw new Error("[helix] Encountered disconnected element");
  }

  return el;
}

// TODO: Try event delegation
// - might be more memory efficient since you wouldn't have so many listeners
// - you wouldn't need document.evaluate at all
function hydrate(rootKey, { listenersByKey }) {
  const nodeSet = document.evaluate(
    `//comment()[contains(string(), " evt ${rootKey}")]`,
    document,
    null,
    XPathResult.UNORDERED_NODE_ITERATOR_TYPE,
  );

  let node;
  while ((node = nodeSet.iterateNext())) {
    const [, key] = node.nodeValue.trim().split(" ");
    const listeners = listenersByKey[key];
    const element = node.nextSibling;

    // TODO: Why is listeners sometimes undefined?
    listeners?.forEach(({ event, handler }) =>
      element.addEventListener(event, handler),
    );
  }
}

/**
 * - "set" replaces html between two keys,
 * - "text" does the same thing for a text node
 * - "overwrite" is like set but it writes over the matching start and end keys
 *   as well
 * - "append" inserts html after the second matching key
 * - "insert" inserts html after the first matching key without replacing
 *   anything
 *
 * @param {"set" | "text" | "overwrite" | "append" | "insert"} [mode="set"]
 */
function setHtml(key, html, mode = "set") {
  debug("Setting html with mode", mode);

  let result = document.evaluate(
    `//comment()[contains(string(), " ${key} ")]`,
    document,
    null,
    mode === "append"
      ? XPathResult.ORDERED_NODE_ITERATOR_TYPE
      : XPathResult.FIRST_ORDERED_NODE_TYPE,
  );

  const node =
    mode === "append"
      ? result.iterateNext() && result.iterateNext()
      : result.singleNodeValue;

  if (mode === "set" || mode === "text" || mode === "overwrite") {
    while (
      node.nextSibling &&
      !(
        node.nextSibling.nodeType === Node.COMMENT_NODE &&
        node.nextSibling.nodeValue?.includes(` ${key} `)
      )
    ) {
      node.nextSibling.remove();
    }
  }

  let newNode;

  if (mode === "text") {
    newNode = document.createTextNode(html);
  } else {
    const template = document.createElement("template");
    template.innerHTML = html;
    newNode = template.content;
  }

  node.parentNode.insertBefore(newNode, node.nextSibling);

  if (mode === "overwrite") {
    node.nextSibling.remove();
    node.remove();
  }
}

function clearMatchingKeys(key, obj, clearSelf = true) {
  Object.keys(obj).forEach((objKey) => {
    if (typeof objKey === "symbol") {
      return;
    }

    const cacheKey = objKey.split("#task")[0];

    if (cacheKey.startsWith(key) && (clearSelf || cacheKey !== key)) {
      delete obj[objKey];
    }
  });
}

function cleanup(key) {
  clearMatchingKeys(key, elementsByKey);
  clearMatchingKeys(key, templatesByKey);
  clearMatchingKeys(key, propsByKey);
  clearMatchingKeys(key, hookInitsByKey);
  clearMatchingKeys(key, componentsByKey);
  clearMatchingKeys(key, accessByKey);
  clearMatchingKeys(key, enumeratedAccessByKey);
}

function cleanupChildren(key) {
  clearMatchingKeys(key, elementsByKey);
  clearMatchingKeys(key, templatesByKey);
  clearMatchingKeys(key, propsByKey, false);
  clearMatchingKeys(key, hookInitsByKey, false);
  clearMatchingKeys(key, componentsByKey, false);
  clearMatchingKeys(key, accessByKey, false);
  clearMatchingKeys(key, enumeratedAccessByKey, false);
}

function render(key, node, depth = 0, domMutations = []) {
  let template;
  if (isTemplate(node)) {
    template = node;
  } else {
    componentsByKey[key] = node;

    delete accessByKey[key];
    delete enumeratedAccessByKey[key];

    renderStack.push({
      type: "component",
      key,
      onUpdate: () => render(key, node),
    });

    componentHookIndex = 0;
    template = node(propsByKey[key] || {});
    componentHookIndex = 0;

    renderStack.pop();
  }

  if (isPrimitive(template)) {
    cleanupChildren(key);

    domMutations.push(() =>
      // No need to escape since setHtml with mode "text" calls createTextNode
      setHtml(key, canRenderPrimitive(template) ? template : "", "text"),
    );

    if (depth === 0 && domMutations.length) {
      domMutations.forEach((mutation) => mutation());

      while (deferredTasks.length) {
        deferredTasks.shift()();
      }
    }

    return;
  }

  if (!template.parsedHtmlPhrases.length) {
    parseTemplateInPlace(template);
  }

  template.components ||= node.components;

  if (!templatesByKey[key] || !isTemplateMatch(templatesByKey[key], template)) {
    cleanupChildren(key);

    const result = renderToString(key, template);

    domMutations.push(() => {
      setHtml(key, result.html);
      hydrate(key, result);
    });

    templatesByKey[key] = template;

    if (depth === 0 && domMutations.length) {
      domMutations.forEach((mutation) => mutation());

      while (deferredTasks.length) {
        deferredTasks.shift()();
      }
    }

    return;
  }

  template.slots.forEach((slot) => {
    const slotKey =
      key + "." + template.identifiers[slot.identifierIndex].suffix;
    const value = template.interpolations[slot.interpolationIndex];
    const prevValue =
      templatesByKey[key].interpolations[slot.interpolationIndex];

    if (isPrimitive(value)) {
      if (prevValue !== value) {
        cleanup(slotKey);

        domMutations.push(() =>
          // No need to escape since setHtml with mode "text" calls
          // createTextNode
          setHtml(slotKey, canRenderPrimitive(value) ? value : "", "text"),
        );
      }
    } else if (isTemplate(value)) {
      if (
        isPrimitive(prevValue) ||
        !isTemplateMatch(prevValue, value) ||
        !isInterpolationsMatch(prevValue, value)
      ) {
        if (isTemplate(prevValue) && !isTemplateMatch(prevValue, value)) {
          cleanup(slotKey);
        }

        value.components ||= template.components;

        render(slotKey, value, depth + 1, domMutations);
      }
    } else if (Array.isArray(value)) {
      if (isTemplate(prevValue)) {
        cleanup(slotKey);
      }

      if (!value.every(isTemplate)) {
        throw new Error(INVALID_ARRAY_ITEM);
      }

      if (!value.every((item) => isValidKey(item.assignedkey))) {
        throw new Error(MISSING_ARRAY_ITEM_KEY);
      }

      let renderAll = false;
      if (!Array.isArray(prevValue)) {
        renderAll = true;
      } else {
        const prevIndexByKey = Object.fromEntries(
          prevValue.map((prevItem, i) => [prevItem.assignedkey, i]),
        );

        let maxIndex = 0;
        const orderChanged = value.some((item) => {
          const prevIndex = prevIndexByKey[item.assignedkey];
          if (typeof prevIndex === "number") {
            if (prevIndex < maxIndex) {
              return true;
            } else {
              maxIndex = prevIndex;
            }
          }
        });

        orderChanged && debug("Array order changed");
        renderAll = orderChanged;
      }

      if (renderAll) {
        cleanup(slotKey);

        const result = value.reduce(
          (result, item) => {
            item.components ||= template.components;

            const itemKey = slotKey + "." + item.assignedkey;
            const currentResult = renderToString(itemKey, item, {
              html: result.html + `<!-- ${itemKey} -->`,
              listenersByKey: result.listenersByKey,
            });
            currentResult.html += `<!-- ${itemKey} -->`;

            return currentResult;
          },
          { html: "", listenersByKey: {} },
        );

        domMutations.push(() => {
          setHtml(slotKey, result.html);
          hydrate(slotKey, result);
        });
      } else {
        // Removed items
        prevValue.forEach((prevItem) => {
          if (
            !value.some((item) => item.assignedkey === prevItem.assignedkey)
          ) {
            const itemKey = slotKey + "." + prevItem.assignedkey;
            cleanup(itemKey);
            domMutations.push(() => setHtml(itemKey, "", "overwrite"));
          }
        });

        // Added or changed items
        value.toReversed().forEach((item, i, reversed) => {
          const itemKey = slotKey + "." + item.assignedkey;
          const prevItem = prevValue.find(
            (prevItem) => prevItem.assignedkey === item.assignedkey,
          );

          item.components ||= template.components;

          if (!prevItem) {
            const result = renderToString(itemKey, item);
            const anchor = reversed
              .slice(i + 1)
              .find((item) =>
                prevValue.some(
                  (prevItem) => prevItem.assignedkey === item.assignedkey,
                ),
              );

            domMutations.push(() => {
              const itemHtml = `<!-- ${itemKey} -->${result.html}<!-- ${itemKey} -->`;

              if (anchor) {
                setHtml(slotKey + "." + anchor.assignedkey, itemHtml, "append");
              } else {
                setHtml(slotKey, itemHtml, "insert");
              }

              hydrate(itemKey, result);
            });
          } else if (
            !isTemplateMatch(prevItem, item) ||
            !isInterpolationsMatch(prevItem, item)
          ) {
            render(itemKey, item, depth + 1, domMutations);
          }
        });
      }
    }
  });

  template.attributes.forEach((attr, i) => {
    const attrValue = template.interpolations[attr.interpolationIndex];
    const prevAttrValue =
      templatesByKey[key].interpolations[
        templatesByKey[key].attributes[i].interpolationIndex
      ];

    if (prevAttrValue !== attrValue) {
      domMutations.push(() => {
        const element = getElementByKey(
          key + "." + template.identifiers[attr.identifierIndex].suffix,
        );

        if (!isHtmlTruthy(attrValue)) {
          element.removeAttribute(attr.name);
        } else if (attrValue === true) {
          element.setAttribute(attr.name, "");
        } else {
          element.setAttribute(attr.name, attrValue);
        }

        if (element.tagName === "INPUT") {
          if (
            attr.name === "checked" &&
            element.checked !== isHtmlTruthy(attrValue)
          ) {
            element.checked = isHtmlTruthy(attrValue);
          } else if (attr.name === "value" && element.value !== attrValue) {
            element.value = attrValue;
          }
        }
      });
    }
  });

  // TODO: special handling for functions that don't reference stale variables
  // but are not themselves referencially stable?
  template.listeners.forEach((listener) => {
    const handler = template.interpolations[listener.interpolationIndex];
    const prevHandler =
      templatesByKey[key].interpolations[listener.interpolationIndex];

    if (prevHandler !== handler) {
      domMutations.push(() => {
        const elementKey =
          key + "." + template.identifiers[listener.identifierIndex].suffix;

        getElementByKey(elementKey).removeEventListener(
          listener.event,
          prevHandler,
        );

        getElementByKey(elementKey).addEventListener(listener.event, handler);
      });
    }
  });

  const keysToRerender = [];
  const renderedPropsByKey = {};

  template.props.forEach((prop, i) => {
    const propKey =
      key + "." + template.identifiers[prop.identifierIndex].suffix;

    // Check prop equality across renders
    if (
      templatesByKey[key].props[i].value !== prop.value ||
      templatesByKey[key].interpolations[prop.interpolationIndex] !==
        template.interpolations[prop.interpolationIndex]
    ) {
      keysToRerender.push(propKey);
    }

    renderedPropsByKey[propKey] ||= {};
    renderedPropsByKey[propKey][prop.name] =
      "value" in prop
        ? prop.value
        : template.interpolations[prop.interpolationIndex];
  });

  // Check if the number of props for each key is the same (sufficient with the
  // equality check above)
  Object.keys(renderedPropsByKey).forEach((key) => {
    if (
      Object.keys(propsByKey[key]).length !==
      Object.keys(renderedPropsByKey[key]).length
    ) {
      keysToRerender.push(key);
    }
  });

  propsByKey = { ...propsByKey, ...renderedPropsByKey };

  keysToRerender.forEach((key) =>
    render(key, componentsByKey[key], depth + 1, domMutations),
  );

  templatesByKey[key] = template;

  if (depth === 0 && domMutations.length) {
    domMutations.forEach((mutation) => mutation());

    while (deferredTasks.length) {
      deferredTasks.shift()();
    }
  }
}

const accessByKey = {};
const enumeratedAccessByKey = {};

const pathPropertyName = Symbol();

function subscribe(lookup, signalId, path) {
  const currentKey = renderStack.at(-1).key;

  if (currentKey) {
    const access = (lookup[currentKey] ||= {});
    const paths = (access[signalId] ||= {});

    if (!paths[path]) {
      paths[path] = renderStack.at(-1);
    }
  }
}

function handleSubs(lookup, signalId, path) {
  const plannedUpdates = [];

  [
    // Symbol keys are only used for tasks defined outside components
    ...Object.getOwnPropertySymbols(lookup).map((symbol) => [
      symbol,
      lookup[symbol],
    ]),
    ...Object.entries(lookup).sort(([a], [b]) => {
      const isATask = a.includes("#task");
      const isBTask = b.includes("#task");

      // Sort tasks first so that the deferredTasks array is taken care of when
      // rendering completes
      return isATask && !isBTask ? -1 : isBTask && !isATask ? 1 : 0;
    }),
  ].forEach(([key, access]) => {
    const paths = access[signalId];

    // TODO: To ensure that each component is rendered no more than once per
    // signal update you'll need to track mutations to the keyStack array
    if (paths?.[path]) {
      const update = paths[path];
      plannedUpdates.push((ctx) => {
        // Check that the key is still present as rendering one key may clear
        // others
        if (lookup[key]) {
          update.onUpdate(ctx);
        }
      });
    }
  });

  const plannedRenders = plannedUpdates.filter(
    (update) => update.type === "component",
  ).length;

  plannedUpdates.forEach((update) => update({ plannedRenders }));
}

class ProxyHandler {
  #signalId;

  constructor(signalId, path) {
    this.#signalId = signalId;
    this.path = path;
  }

  get(target, prop, receiver) {
    if (prop === pathPropertyName) {
      return this.path;
    }

    const value = Reflect.get(target, prop, receiver);
    let proxied;

    if (Array.isArray(value) || isPlainObject(value)) {
      if (typeof value[pathPropertyName] === "string") {
        proxied = value;
        proxied[pathPropertyName] = this.path + "." + prop;
      } else {
        proxied = new Proxy(
          value,
          new ProxyHandler(this.#signalId, this.path + "." + prop),
        );
      }
    } else {
      proxied = value;
    }

    if (renderStack.length) {
      if (
        Array.isArray(target) &&
        (typeof value === "function" || prop === "length")
      ) {
        subscribe(enumeratedAccessByKey, this.#signalId, this.path);
      } else {
        subscribe(accessByKey, this.#signalId, this.path + "." + prop);
      }
    }

    if (
      Array.isArray(target) &&
      (prop === "splice" ||
        prop === "fill" ||
        prop === "sort" ||
        prop === "reverse" ||
        prop === "shift" ||
        prop === "unshift" ||
        prop === "push" ||
        prop === "pop")
    ) {
      return (...args) => {
        debug("calling proxied", prop);

        // TODO: In order to handle the edge case where an array is mutated via
        // method but accessed elsewhere via arr[n], you'll need to track the
        // mutations that occur during method execution, and then let
        // subscribers know about them when the method is complete
        const result = target[prop](...args);

        handleSubs(enumeratedAccessByKey, this.#signalId, this.path);

        return result;
      };
    }

    return proxied;
  }

  has(target, prop, receiver) {
    subscribe(enumeratedAccessByKey, this.#signalId, this.path);

    return Reflect.has(target, prop, receiver);
  }

  ownKeys(target) {
    subscribe(enumeratedAccessByKey, this.#signalId, this.path);

    return Reflect.has(target, prop, receiver);
  }

  set(target, prop, value, receiver) {
    if (prop === pathPropertyName) {
      this.path = value;
      return true;
    }

    Reflect.set(target, prop, value, receiver);

    if (Array.isArray(target) || isPlainObject(target)) {
      handleSubs(enumeratedAccessByKey, this.#signalId, this.path);
    }

    handleSubs(accessByKey, this.#signalId, this.path + "." + prop);

    return true;
  }

  deleteProperty(target, prop) {
    Reflect.deleteProperty(target, prop, receiver);

    handleSubs(enumeratedAccessByKey, this.#signalId, this.path);

    return true;
  }
}

const hookInitsByKey = {};

let componentHookIndex = 0;

export function signal(initialValue) {
  const currentKey =
    renderStack.at(-1)?.type === "component"
      ? renderStack.at(-1).key
      : undefined;

  if (currentKey) {
    hookInitsByKey[currentKey] ||= {};
    return (hookInitsByKey[currentKey][componentHookIndex++] ||= new Proxy(
      { val: initialValue },
      new ProxyHandler(Symbol(), "[root]"),
    ));
  } else {
    return new Proxy(
      { val: initialValue },
      new ProxyHandler(Symbol(), "[root]"),
    );
  }
}

const deferredTasks = [];

// TODO: Allow returning a cleanup function
export function task(callback) {
  const componentKey =
    renderStack.at(-1)?.type === "component"
      ? renderStack.at(-1).key
      : undefined;

  const isFirstRender = !hookInitsByKey[componentKey]?.[componentHookIndex];

  if (componentKey) {
    hookInitsByKey[componentKey] ||= {};
    hookInitsByKey[componentKey][componentHookIndex] = true;
  }

  const taskKey = componentKey
    ? `${componentKey}#task-${componentHookIndex++}`
    : Symbol();

  const doTask = () => {
    renderStack.push({
      type: "task",
      key: taskKey,
      onUpdate: ({ plannedRenders }) => {
        if (renderStack.at(-1)?.key === taskKey) {
          // Prevent infinite recursion by doing nothing if the update happened
          // during the task itself
          return;
        }

        if (plannedRenders > 0) {
          // Wait to execute tasks until rendering is complete
          deferredTasks.push(doTask);
        } else {
          doTask();
        }
      },
    });

    delete accessByKey[taskKey];
    delete enumeratedAccessByKey[taskKey];

    callback();

    renderStack.pop();
  };

  if (!componentKey || isFirstRender) {
    deferredTasks.push(doTask);
  }
}
