"use strict";

const vm = require("vm");
const fetch = require("node-fetch");

function getCdnUrl(fullName, filePath) {
  const isGithub = fullName.startsWith("gh/");
  let cdnPath;

  if (isGithub) {
    const repoPath = fullName.substring(3); // Remove 'gh/' prefix
    cdnPath = `https://cdn.jsdelivr.net/gh/${repoPath}@latest/${filePath}`;
  } else {
    cdnPath = `https://cdn.jsdelivr.net/${fullName}/${filePath}`;
  }

  // Add cache busting parameter
  return `${cdnPath}?v=${Date.now()}`;
}

function startService(mdl, services) {
  let sandbox = {};

  Object.getOwnPropertyNames(global).forEach((prop) => {
    const disAllowed = [
      "services",
      "module",
      "global",
      "inDebug",
      "currentClient",
      "currentModule",
    ];
    // Node.js v4.4.3 does not have Array.prototype.includes...
    if (disAllowed.indexOf(prop) >= 0) return;
    sandbox[prop] = global[prop];
  });

  sandbox["require"] = require;
  sandbox["tizen"] = global.tizen;
  sandbox["module"] = { exports: {} };

  const cdnUrl = getCdnUrl(mdl.fullName, mdl.serviceFile);

  fetch(cdnUrl)
    .then((res) => res.text())
    .then((script) => {
      services.set(mdl.fullName, {
        context: vm.createContext(sandbox),
        hasCrashed: false,
        error: null,
      });

      try {
        vm.runInContext(script, services.get(mdl.fullName).context);
      } catch (e) {
        services.get(mdl.fullName).hasCrashed = true;
        services.get(mdl.fullName).error = e;
        console.error(`Service ${mdl.fullName} crashed:`, e);
      }
    })
    .catch((e) => {
      console.error(`Failed to load service ${mdl.fullName}:`, e);
      if (services.has(mdl.fullName)) {
        services.get(mdl.fullName).hasCrashed = true;
        services.get(mdl.fullName).error = e;
      } else {
        services.set(mdl.fullName, {
          context: null,
          hasCrashed: true,
          error: e,
        });
      }
    });
}

module.exports = startService;
