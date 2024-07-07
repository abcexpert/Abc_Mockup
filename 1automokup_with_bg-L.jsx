function main() {
    console.log("Начало выполнения скрипта");

    var inputFolder = new Folder("C:/abc/abc_mockup/1L/Mockup");
    var outputFolder = new Folder("C:/abc/abc_mockup/1L/output");
    var inputImageFolder = new Folder("C:/abc/abc_mockup/1L/Png");
    var bgFolder = new Folder("C:/abc/abc_mockup/1L/bg");

    app.displayDialogs = DialogModes.NO;

    console.log("Проверка существования выходной папки");
    if (!outputFolder.exists) outputFolder.create();
    console.log("Проверка существования папки с изображениями");
    if (!inputImageFolder.exists) {
        console.log("Папка с изображениями не найдена.");
        alert("Папка с изображениями не найдена.");
        return;
    }

    var allowedMockupFileLastWriteTime = new Date("6/29/2024");
    var psdFiles = inputFolder.getFiles("*.psd");

    console.log("Проверка наличия файлов .psd");
    if (psdFiles.length === 0) {
        console.log("Файл мокапа .psd не найден в папке.");
        alert("Файл мокапа .psd не найден в папке.");
        return;
    }

    var mockupFile = psdFiles[0];
    var mockupFileLastWriteTime = new Date(mockupFile.modified);

    console.log("Проверка времени последнего изменения файла мокапа");
    if (mockupFileLastWriteTime.toDateString() !== allowedMockupFileLastWriteTime.toDateString()) {
        console.log("Файл мокапа не корректен");
        alert("Файл мокапа не корректен");
        return;
    }

    console.log("Открытие PSD файла");
    var docMockup = app.open(psdFiles[0]);  // Открываем PSD файл
    var smartObjectLayer = findLayerByName(docMockup.layers, "A");
    if (!smartObjectLayer || smartObjectLayer.kind !== LayerKind.SMARTOBJECT) {
        console.log("Слой 'A' не найден или не является смарт-объектом.");
        alert("Слой 'A' не найден или не является смарт-объектом.");
        docMockup.close(SaveOptions.DONOTSAVECHANGES);
        return;
    }

    console.log("Вставка фона, если файл существует");
    insertBackground(docMockup, bgFolder);

    var pngFiles = inputImageFolder.getFiles("*.png");
    for (var i = 0; i < pngFiles.length; i++) {
        console.log("Обработка файла PNG: " + pngFiles[i].name);
        app.activeDocument = docMockup;
        docMockup.activeLayer = smartObjectLayer;
        executeAction(stringIDToTypeID("placedLayerEditContents"));  // Открыть смарт-объект
        var smartDoc = app.activeDocument;
        var smartWidth = smartDoc.width.as("px");
        var smartHeight = smartDoc.height.as("px");

        var pngFile = pngFiles[i];
        var pngDoc = app.open(pngFile);  // Открываем PNG файл
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
        smartDoc.close(SaveOptions.SAVECHANGES); // Сохранить и закрыть смарт-объект

        var jpegFileName = "left_aligned_mockup_" + (i + 1) + ".jpeg";
        var jpegFile = new File(outputFolder.fsName + "/" + jpegFileName);
        var jpegSaveOptions = new JPEGSaveOptions();
        jpegSaveOptions.quality = 12;
        docMockup.saveAs(jpegFile, jpegSaveOptions, true, Extension.LOWERCASE);
    }

    console.log("Закрытие основного PSD документа");
    docMockup.close(SaveOptions.DONOTSAVECHANGES); // Закрыть основной PSD документ

    app.displayDialogs = DialogModes.ALL;
    console.log("Все мокапы успешно созданы и сохранены.");
    alert("Все мокапы успешно созданы и сохранены.");
}

function findLayerByName(layers, name) {
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        if (layer.name === name && layer.kind === LayerKind.SMARTOBJECT) {
            return layer;
        } else if (layer.typename === 'LayerSet') {
            var foundLayer = findLayerByName(layer.layers, name);
            if (foundLayer) {
                return foundLayer;
            }
        }
    }
    return null;
}

function insertBackground(docMockup, bgFolder) {
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
        }
    }
}

main();
