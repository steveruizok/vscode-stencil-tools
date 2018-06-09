import { Config } from './config/interface';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import * as fs from 'fs';
import * as path from 'path';
import * as changeCase from 'change-case';
import { Observable } from 'rxjs';

export class FileHelper {
    private static createFile = <(file: string, data: string) => Observable<{}>>Observable.bindNodeCallback(fse.outputFile);
    private static assetRootDir: string = path.join(__dirname, '../../assets');

    public static createComponent(componentDir: string, componentName: string, config: Config): Observable<string> {
        let templateFileName = this.assetRootDir + '/templates/component.template';
        if (config.component.template) {
            templateFileName = this.resolveWorkspaceRoot(config.component.template);
        }

        let componentContent = fs.readFileSync(templateFileName).toString()
            .replace(/{additionalImports}/g, this.getImports(config))
            .replace(/{selector}/g, this.getSelector(componentName, config))
            .replace(/{styleUrl}/g, `${componentName}.${config.style.extension}`)
            .replace(/{className}/g, changeCase.pascalCase(componentName))
            .replace(/{shadow}/g, this.getShadow(config))
            .replace(/{quotes}/g, this.getQuotes(config));

        let filename = `${componentDir}/${componentName}.${config.component.extension}`;

        if (config.component.create) {
            return this.createFile(filename, componentContent)
                .map(result => filename);
        }
        else {
            return Observable.of('');
        }
    };

    public static createStyle(componentDir: string, componentName: string, config: Config): Observable<string> {
        const { style } = config;
        let templateFileName = this.assetRootDir + '/templates/style.template';
        if (style.template) {
            templateFileName = this.resolveWorkspaceRoot(style.template);
        }

        let block = this.getBlockOpenAndClose(config);
        let styleContent = fs.readFileSync(templateFileName).toString()
            .replace(/{styleSelector}/g, this.getStyleSelector(componentName, config))
            .replace(/{blockOpen}/g, block.open)
            .replace(/{blockClose}/g, block.close);


        let filename = `${componentDir}/${componentName}.${style.extension}`;
        if (style.create) {
            return this.createFile(filename, styleContent)
                .map(result => filename);
        }
        else {
            return Observable.of('');
        }
    };

    public static createComponentDir(uri: any, componentName: string, config: Config): string {
        let contextMenuSourcePath;

        if (uri && fs.lstatSync(uri.fsPath).isDirectory()) {
            contextMenuSourcePath = uri.fsPath;
        } else if (uri) {
            contextMenuSourcePath = path.dirname(uri.fsPath);
        } else {
            contextMenuSourcePath = path.join(vscode.workspace.rootPath, path.normalize(config.componentsDirectory));
        }

        let componentDir = `${contextMenuSourcePath}`;
        if (config.generateFolder) {
            componentDir = `${contextMenuSourcePath}/${componentName}`;
            fse.mkdirsSync(componentDir);
        }

        return componentDir;
    }

    public static createTest(componentDir: string, componentName: string, config: Config) {
        let templateFileName = this.assetRootDir + '/templates/component.spec.template';

        let testContent = fs.readFileSync(templateFileName).toString()
            .replace(/{fileName}/g, componentName)
            .replace(/{selector}/g, this.getSelector(componentName, config))
            .replace(/{componentInterface}/g, this.getInterface(this.getSelector(componentName, config)))
            .replace(/{className}/g, changeCase.pascalCase(componentName))
            .replace(/{quotes}/g, this.getQuotes(config));

        let filename = `${componentDir}/${componentName}.${config.test.extension}`;

        if (config.test.create) {
            return this.createFile(filename, testContent)
                .map(result => filename);
        }
        else {
            return Observable.of('');
        }
    }

    public static createTestFromComponent(fromFilePath: string, componentClass: string, componentSelector: string, config: Config) {
        let templateFileName = this.assetRootDir + '/templates/component.spec.template';
        let fileImport = `${path.basename(fromFilePath)}`;

        let testContent = fs.readFileSync(templateFileName).toString()
            .replace(/{fileName}/g, fileImport)
            .replace(/{selector}/g, componentSelector)
            .replace(/{componentInterface}/g, this.getInterface(componentSelector))
            .replace(/{className}/g, componentClass)
            .replace(/{quotes}/g, this.getQuotes(config));

        let filename = `${fromFilePath}.${config.test.extension}`;
        try {
            if (fs.lstatSync(filename).isFile()) {
                return Observable.of('');
            }
        } catch(e) {
            console.log(filename)
            return this.createFile(filename, testContent)
                .map(result => filename);
        }
        // if (filename && fs.lstatSync(filename).isFile()) {
        //     throw new Error();
        // } else {
            
        // }
    }


    public static resolveWorkspaceRoot(path: string): string {
        return path.replace('${workspaceRoot}', vscode.workspace.rootPath);
    }

    private static getSelector(componentName: string, config: Config) {
        const prefix = config.component.prefix;
        if (prefix) {
            return `${prefix}-${changeCase.paramCase(componentName)}`;
        } else {
            return changeCase.paramCase(componentName);
        }
    }

    private static getShadow(config: Config) {
        return config.component.shadow ? ',\n    shadow: true' : ''
    }

    private static getImports(config: Config) {
        return (config.component.imports === false) ? '' : `, ${config.component.imports.join()}`;
    }

    private static getInterface(selector: string) {
        return `HTML${changeCase.pascal(selector)}Element`;
    }

    private static getBlockOpenAndClose(config: Config): { open: string, close: string } {
        return config.style.extension === 'sass' ? { open: '', close: ''} : { open: ' {', close: '}'}
    }
    
    private static getStyleSelector(componentName: string, config: Config) {
        return config.component.shadow ? ':host' : this.getSelector(componentName, config);
    }

    private static getQuotes(config: Config) {
        return config.quotes === "double" ? '"' : '\'';
    }

}
