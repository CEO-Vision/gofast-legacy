//search for the folder node using lucene search
var node = search.findNode(args.reference);
var render = "";
var document_type = args.type;
var restrictdepth = args.restrictdepth;
var origine = encodeURI(decodeURIComponent(args.origine));
var depth = 0;

var privateSpacePath;

//debug
//restrictdepth = "true";

var descendants = "";
var arraydescendants = [];

// Prevent empty origine
if (origine === null) {
  origine = "/Sites/";
};

if (document_type === null) {
  document_type = "all";
}

/**
 * Path up to which all items are ignored, itself included
 * @type {string[]|null|undefined}
 */
var skipUntilAfterPath = (function(){
  /** @type {string} */
  var path = args.skipUntilAfterPath;
  // Path not passed, ignore.
  if (!path) return path;
  // Remove origin path from beginning of path.
  if (path.indexOf(origine) === 0) path = path.substr(origine.length);
  // Split on path separator and remove empty strings
  return path.split('/').filter(function(s){return s.length;});
})();

/** Maximum number of items to report */
var maxItems = args.maxItems;
if (maxItems == null) {
  maxItems = Infinity;
} else if (typeof maxItems === 'string') {
  maxItems = Number(maxItems);
}

function nodeIsGroup(nodeName) {
  return nodeName.substr(0, 1) === "_";
}

function getDocument(node_document) {
  var element = [];
  if (node_document.isDocument) {
    var history = node_document.versionHistory;

    if (history !== null) {
      element['creator'] = history[0].creator;
      element['version'] = history[0].label;
      element['date_version'] = utils.toISO8601(history[0].createdDate);
      element["url"] = node_document.properties["cm:name"] + "**" + node_document.nodeRef + "**" + history[0].creator + "**" + node_document.size + "**" + history[0].label + "**" + utils.toISO8601(history[0].createdDate) + "**";
    } else {
      element['creator'] = node_document.properties["cm:creator"];
      element['version'] = "1.0";
      element['date_version'] = utils.toISO8601(node_document.properties["cm:created"]);
      element["url"] = node_document.properties["cm:name"] + "**" + node_document.nodeRef + "**" + node_document.properties["cm:creator"] + "**" + node_document.size + "**1.0**" + utils.toISO8601(node_document.properties["cm:created"]) + "**";
    }
    element['name'] = node_document.properties["cm:name"];
    element['id'] = node_document.nodeRef;
    element['size'] = node_document.size;
    element['path'] = node_document.webdavUrl;
    element['ismirrored'] = false;
    for (var property in node_document.properties) {
      if (property.indexOf("gofast.model") > 0) {
        element[property.substr(14)] = node_document.properties[property];
      }
    }
    //element['nid'] = node_document.properties["{gofast.model}nid"];
    arraydescendants.push(element);
  }
}

function getFolder(node_folder, isGroup, parentFolder) {

  var currentNode = node_folder.webdavUrl;
  // Remove '/webdav/Sites/' from the path
  currentNode = currentNode.substr(currentNode.indexOf("/webdav/Sites/") + "/webdav/Sites/".length - 1);

  // if webdavUrl exist
  if (parentFolder != null) {
    currentParent = parentFolder.webdavUrl;
    // Remove '/webdav/Sites/' from the path if the path is not '/webdav/Sites'
    if (currentParent != null && currentParent != "/webdav/Sites"){
      currentParent = currentParent.substr(currentParent.indexOf("/webdav/Sites/") + "/webdav/Sites/".length - 1);
    }else{
      currentParent = "";
    }    
  }else{
    currentParent = "";
  }

  // If origin != /Sites/ then remove /Sites/ from the path
  originPath = origine;
  if (origine != "/Sites/") {
    originPath = origine.substr(origine.indexOf("/Sites/") + "/Sites/".length - 1);
  }

  var element = [];
  var webdavUrl = node_folder.webdavUrl;

  // In case of first getDescendants call (where origine is /Sites/), if there is a mirror whith a wrong path (if main emplacement is a space instead of private space) then we will fix it
  if (isGroup && origine == "/Sites/") {

    // Get first element of the currentNode Path
    var arrayCurrentNode = currentNode.split("/");
    var firstElement = arrayCurrentNode[1];
    var groups = ["_Groups", "_Extranet", "_Public", "_Organisations"];
    if (groups.includes(firstElement) == false) {
      // Keep actual private space path
      privateSpacePath = currentNode;
    }
  }


  if (node_folder.isContainer && !isGroup && node_folder.hasPermission("Write") == true) {    

    // Don't return the folder if it's a mirrored folder and we don't have write access on the targeted parent
    if(node_folder.getParents().length > 1 && parentFolder){
      if(!parentFolder.hasPermission("Write")){
        return;
      }
    }

    // If parentFolder not begin by the origin, then replace it by the origin
    if (encodeURIComponent(decodeURIComponent(currentParent)).indexOf(encodeURIComponent(decodeURIComponent(originPath))) === -1 && origine != "/Sites/") {
      // Split the originPath path
      var arrayOriginPath = originPath.split("/");
      // Get the last element of the array
      var lastElementOrigin = arrayOriginPath[arrayOriginPath.length - 1];
      
      // Split the currentParent path
      var arrayCurrentParent = currentParent.split("/");
      
      // Reach all element of the array
      var findFolder = false;
      for (var i = 0; i < arrayCurrentParent.length; i++) {
        // If the element equal the last element of the originPath
        if (arrayCurrentParent[i] == lastElementOrigin) {
          findFolder = true;
          // Remove the current element from arrayCurrentParent and all previous elements
          arrayCurrentParent.splice(0, i+1);
          break;
        }
      }
      if (findFolder == false) {
        // If we didn't find the last element of the originPath, we remove all spaces (element begin by '_') from the array
        finalPath = [];
        for (var i = 0; i < arrayCurrentParent.length; i++) {
          if (!arrayCurrentParent[i].startsWith("_")) {
            finalPath.push(arrayCurrentParent[i]);
          }
        }
        arrayCurrentParent = finalPath;
      }
      // Join the array to create the new currentParent
      currentParent = arrayCurrentParent.join("/");
        
      // Add originePath before the currentParent
      currentParent = originPath +  currentParent;
    }

    // for safe comparison with special charsæ
    var currentNode = decodeURIComponent(currentNode);
    if(currentParent != ""){
      var currentParent = decodeURIComponent(currentParent);
    }


    // Check if currentNode begins with the currentParent
    if ((currentNode.indexOf(currentParent) === -1 || currentParent == "/")) {
      // Get the last element of the array
      var arrayCurrentNode = currentNode.split("/");
      var lastElement = arrayCurrentNode[arrayCurrentNode.length - 1];


    }
    
    // Add it to the currentParent
    webdavUrl = "/webdav/Sites" + currentParent + "/" + node_folder.name;

    // Encode the new webdavUrl without '/'
    webdavUrl = encodeURI(webdavUrl);
    webdavUrl = webdavUrl.replace(/%2F/g, "/");

    element["url"] = webdavUrl;
    element['name'] = node_folder.properties["cm:name"];
    element['id'] = node_folder.nodeRef;
    for (var property in node_folder.properties) {
      if (property.indexOf("gofast.model") > 0) {
        element[property.substr(14)] = node_folder.properties[property];
      }
    }
    arraydescendants.push(element);
  }
}



function getGroup(node_group, isGroup) {
  var element = [];
  if (node_group.isContainer && isGroup) {
    element["url"] = node_group.webdavUrl;
    for (var property in node_group.properties) {
      if (property.indexOf("gofast.model") > 0) {
        element[property.substr(14)] = node_group.properties[property];
      }
    }
    element['name'] = node_group.properties["cm:name"];
    element['id'] = node_group.nodeRef;
    element['ismirrored'] = false;
    arraydescendants.push(element);
  }
}

function getTemplates(node_template) {
  for each(var child in node_template.children) {
    if (arraydescendants.length > maxItems) {
      return;
    }

    if (child.isDocument) {
      getDocument(child);
    } else {
      getTemplates(child);
    }
  }
}

// Whether the getDescendants function is skipping to a provided skipUntilAfterPath
// argument. If the argument is not provided, this changes nothing.
var skippingToPathSegment = true;

function getDescendants(node, recursion, depth) {
  // Set default values.
  if (depth == null) depth = 0;

  // Looping for each children of node
  if (node !== null) {
    var registerStart = true;
    var start = 0;
    // First check if we need to skip to given path before iterating on children.
    // For that we do a binary search to find the correct element corresponding
    // to the current depth passed in the skip path.
    if (skippingToPathSegment && skipUntilAfterPath && skipUntilAfterPath.length && skipUntilAfterPath.length > depth) {
      // we assume the children property is already sorted to perform a binary search.
      var searchArray = node.children;
      var end = searchArray.length - 1;
      var found = false;
      var isLastSegment = depth === (skipUntilAfterPath.length - 1);
      var targetString = skipUntilAfterPath[depth];

      while (end >= start) {
        // Adding half of the difference between the bounds ensures we always
        // stay within safe integer ranges so long as both bounds were within
        // them as well.
        var index = start + Math.floor((end - start) / 2);
        var middleChild = searchArray[index];
        var comparison = targetString.localeCompare(middleChild.name);

        if (comparison === 0) {
          start = index;
          found = true;
          break
        } else if (comparison > 0) {
          start = index + 1;
        } else {
          end = index - 1;
        }
      }

      // We want to exclude the item if we find it, so we increment the index
      // from which we'll start iterating on the children.
      if (found) {
        registerStart = false;
        if (isLastSegment) {
          skippingToPathSegment = false;
        }
      }
    }

    for (var i = start; i < node.children.length; ++i) {
      var child = node.children[i];
      if (arraydescendants.length > maxItems) {
        return;
      }

      // Excluding alfresco technical folders
      if (child.name.indexOf('surf-config') !== -1) {
        continue;
      }
      var isGroup = nodeIsGroup(child.name);

      if (registerStart || i !== start) {
        if (document_type === "documents") {
          getDocument(child);
        } else if (document_type === "folders") {
          getFolder(child, isGroup, node);
        } else if (document_type === "groups") {
          getGroup(child, isGroup);
        } else if (document_type === "groupsfolders") {
          getFolder(child, isGroup, node);
          getGroup(child, isGroup);
        } else if (document_type === "templates") {
          if (child.name.equals("TEMPLATES")) {
            getTemplates(child);
          }
        } else {
          getDocument(child);
          getFolder(child, isGroup, node);
          getGroup(child, isGroup);
        }
      }

      if (restrictdepth == "true") {
        // This condition is most likely always false since the starting value for `recursion` is now false
        // it could be useful not to delete it right now in case the false
        // starting value needs to be switched to a 'template' starting value to
        // fix some bugs.
        if (recursion == true || recursion == "template") {

          if (document_type === "templates") {
            if (recursion == "template") {
              getDescendants(child, false, depth + 1);
            } else {
              getDescendants(child, "template", depth + 1);
            }
          } else {
            if (child.isContainer && !node.name.equals("TEMPLATES")) {
              getDescendants(child, false, depth + 1);
            }
          }
        }
      } else {
        if (child.isContainer && !node.name.equals("TEMPLATES")) {
          getDescendants(child, true, depth + 1);
        }
      }

    }
  }
}

getDescendants(node, false);

var hasMore = arraydescendants.length > maxItems;
arraydescendants.splice(maxItems);

descendants = jsonUtils.toJSONString({
  descendants: arraydescendants,
  hasMore: hasMore
});
render = descendants;

model.myStatus = render;
