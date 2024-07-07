function main() {
    $.writeln("Script started");
    
    var inputFolder = new Folder("C:/abc/abc_mockup/1L/Mockup");
    var outputFolder = new Folder("C:/abc/abc_mockup/1L/output");
    var inputImageFolder = new Folder("C:/abc/abc_mockup/1L/Png");
    var bgFolder = new Folder("C:/abc/abc_mockup/1L/bg");

    // Подавление всех диалоговых окон, кроме ошибок
    app.displayDialogs = DialogModes.NO;

    $.writeln("Input Folder: " + inputFolder.fsName);
    $.writeln("Output Folder: " + outputFolder.fsName);
    $.writeln("Input Image Folder: " + inputImageFolder.fsName);
    $.writeln("BG Folder: " + bgFolder.fsName);

    if (!outputFolder.exists) {
        outputFolder.create();
        $.writeln("Output folder created: " + outputFolder.fsName);
    }

    if (!inputImageFolder.exists) {
        alert("Папка с изображениями не найдена.");
        $.writeln("Input image folder not found");
        return;
    }

    var allowedMockupFileLastWriteTime = new Date("6/29/2024");

    var psdFiles = inputFolder.getFiles("*.psd");
    if (psdFiles.length === 0) {
        alert("Файл мокапа .psd не найден в папке.");
        $.writeln("Mockup PSD file not found in folder");
        return;
    }

    var mockupFile = psdFiles[0];
    var mockupFileLastWriteTime = new Date(mockupFile.modified);

    if (mockupFileLastWriteTime.toDateString() !== allowedMockupFileLastWriteTime.toDateString()) {
        alert("Файл мокапа не корректен");
        $.writeln("Mockup file is not correct");
        return;
    }

    $.writeln("Opening PSD file: " + mockupFile.fsName);
    var docMockup = app.open(psdFiles[0]);
    var smartObjectLayer = findLayerByName(docMockup.layers, "A");
    if (!smartObjectLayer || smartObjectLayer.kind !== LayerKind.SMARTOBJECT) {
        alert("Слой 'A' не найден или не является смарт-объектом.");
        $.writeln("Layer 'A' not found or not a smart object");
        docMockup.close(SaveOptions.DONOTSAVECHANGES);
        return;
    }

    insertBackground(docMockup, bgFolder);

    var pngFiles = inputImageFolder.getFiles("*.png");
    for (var i = 0; i < pngFiles.length; i++) {
        app.activeDocument = docMockup;
        docMockup.activeLayer = smartObjectLayer;
        executeAction(stringIDToTypeID("placedLayerEditContents"));
        var smartDoc = app.activeDocument;
        var smartWidth = smartDoc.width.as("px");
        var smartHeight = smartDoc.height.as("px");

        var pngFile = pngFiles[i];
        var pngDoc = app.open(pngFile);
        var scaleFactor = smartHeight / pngDoc.height;
        pngDoc.resizeImage(pngDoc.width * scaleFactor, smartHeight, null, ResampleMethod.BICUBIC);

        pngDoc.selection.selectAll();
        pngDoc.selection.copy();
        pngDoc.close(SaveOptions.DONOTSAVECHANGES);

        var newLayer = smartDoc.artLayers.add();
        smartDoc.selection.selectAll();
        smartDoc.selection.fill(app.foregroundColor);
        smartDoc.paste();

        var pastedLayer = smartDoc.activeLayer;
        var layerBounds = pastedLayer.bounds;
        var deltaX = -layerBounds[0].as("px");
        pastedLayer.translate(deltaX, 0);

        smartDoc.save();
        smartDoc.close(SaveOptions.SAVECHANGES);

        var jpegFileName = "left_aligned_mockup_" + (i + 1) + ".jpeg";
        var jpegFile = new File(outputFolder.fsName + "/" + jpegFileName);
        var jpegSaveOptions = new JPEGSaveOptions();
        jpegSaveOptions.quality = 12;
        docMockup.saveAs(jpegFile, jpegSaveOptions, true, Extension.LOWERCASE);

        $.writeln("Mockup created: " + jpegFile.fsName);
    }

    docMockup.close(SaveOptions.DONOTSAVECHANGES);
    app.displayDialogs = DialogModes.ALL;
    alert("Все мокапы успешно созданы и сохранены.");
    $.writeln("Script finished");
}

function findLayerByName(layers, name) {
    $.writeln("Finding layer by name: " + name);
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        if (layer.name === name && layer.kind === LayerKind.SMARTOBJECT) {
            $.writeln("Layer found: " + name);
            return layer;
        } else if (layer.typename === 'LayerSet') {
            var foundLayer = findLayerByName(layer.layers, name);
            if (foundLayer) {
                return foundLayer;
            }
        }
    }
    $.writeln("Layer not found: " + name);
    return null;
}

function insertBackground(docMockup, bgFolder) {
    $.writeln("Inserting background from folder: " + bgFolder.fsName);
    var bgFiles = bgFolder.getFiles(function(f) { return f instanceof File && f.name.match(/\.(jpeg|jpg|png|gif)$/i); });
    if (bgFiles.length > 0) {
        var bgFile = bgFiles[0];
        var layerBG = findLayerByName(docMockup.layers, 'bg');
        if (layerBG) {
            app.activeDocument = docMockup;
            docMockup.activeLayer = layerBG;
            var bgDoc = app.open(bgFile);
            var docWidth = docMockup.width.as('px');
            var docHeight = docMockup.height.as('px');

            var scaleFactor = Math.max(docWidth / bgDoc.width.as('px'), docHeight / bgDoc.height.as('px'));
            bgDoc.resizeImage(bgDoc.width.as('px') * scaleFactor, bgDoc.height.as('px') * scaleFactor, null, ResampleMethod.BICUBIC);

            bgDoc.selection.selectAll();
            bgDoc.selection.copy();
            bgDoc.close(SaveOptions.DONOTSAVECHANGES);
            app.activeDocument = docMockup;
            docMockup.paste();
            var pastedLayer = docMockup.activeLayer;
            pastedLayer.name = 'bg';

            var newBounds = pastedLayer.bounds;
            var newLayerWidth = newBounds[2].as('px') - newBounds[0].as('px');
            var newLayerHeight = newBounds[3].as('px') - newBounds[1].as('px');
            pastedLayer.translate((docWidth - newLayerWidth) / 2 - newBounds[0].as('px'), (docHeight - newLayerHeight) / 2 - newBounds[1].as('px'));
            $.writeln("Background inserted");
        }
    }
}

main();
