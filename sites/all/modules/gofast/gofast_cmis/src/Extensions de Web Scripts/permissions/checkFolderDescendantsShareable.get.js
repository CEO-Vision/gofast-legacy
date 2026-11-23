/**
 * Check if any descendant document is multi-filed or any descendant folder is
 * non-trivially mirrored, to determine if the folder can be shared.
 *
 * This performs a single server-side traversal instead of N individual HTTP
 * calls from PHP, avoiding gateway timeouts on large folders.
 *
 * Parameters:
 *   reference: alfresco nodeRef of the folder to check
 *
 * Returns JSON:
 *   { "hasMultifiedDocuments": bool, "hasMirroredFolders": bool }
 */

var reference = args.reference;
var folderNode = search.findNode(reference);

var hasMultifiedDocuments = false;
var hasMirroredFolders = false;

/**
 * Recursively traverse all descendants and check:
 * - Documents: if any has more than 1 parent (multi-filed)
 * - Folders: if any has more than 1 parent AND at least one of those parents
 *   has only 1 parent (i.e. the folder is not just inside a mirrored location
 *   but has been explicitly placed in an unrelated second location)
 *
 * Exits as soon as a problem is found.
 */
function checkDescendants(node) {
  var children = node.children;
  for (var i = 0; i < children.length; i++) {
    var child = children[i];

    // Skip Alfresco technical folders
    if (child.name.indexOf('surf-config') !== -1) {
      continue;
    }

    if (child.isDocument) {
      if (child.getParents().length > 1) {
        hasMultifiedDocuments = true;
        return;
      }
    } else if (child.isContainer) {
      var parents = child.getParents();
      if (parents.length > 1) {
        // The folder has multiple parents. Check if at least one of those
        // parents is NOT itself mirrored (has only 1 parent). If so, the
        // folder was explicitly multi-filed into an unrelated location.
        for (var j = 0; j < parents.length; j++) {
          if (parents[j].getParents().length <= 1) {
            hasMirroredFolders = true;
            return;
          }
        }
      }
      checkDescendants(child);
      if (hasMultifiedDocuments || hasMirroredFolders) {
        return; // early exit
      }
    }
  }
}

if (folderNode === null) {
  model.result = jsonUtils.toJSONString({ error: "Node not found" });
} else {
  checkDescendants(folderNode);
  model.result = jsonUtils.toJSONString({
    hasMultifiedDocuments: hasMultifiedDocuments,
    hasMirroredFolders: hasMirroredFolders
  });
}