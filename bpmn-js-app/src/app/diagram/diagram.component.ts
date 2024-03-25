import {
  AfterContentInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { diff } from 'bpmn-js-differ';
import BpmnModdle from 'bpmn-moddle';


import type { ImportDoneEvent, ImportXMLResult } from 'bpmn-js';
import type Canvas from 'diagram-js/lib/core/Canvas';

/**
 * You may include a different variant of BpmnJS:
 *
 * bpmn-viewer  - displays BPMN diagrams without the ability
 *                to navigate them
 * bpmn-modeler - bootstraps a full-fledged BPMN editor
 */
import BpmnJS from 'bpmn-js/lib/Modeler';

import { from, Observable } from 'rxjs';

@Component({
  selector: 'app-diagram',
  template: `
    <div #ref class="diagram-container"></div>
  `,
  styles: [
    `
      .diagram-container {
        height: 100%;
        width: 100%;
      }
    `
  ]
})
export class DiagramComponent implements AfterContentInit, OnChanges, OnDestroy, OnInit {

  @ViewChild('ref', { static: true }) private el: ElementRef;
  @Input() private url?: string;
  @Output() private importDone: EventEmitter<ImportDoneEvent> = new EventEmitter();
  private bpmnJS: BpmnJS = new BpmnJS();
  currElement: any;
  oldDefinitions: any;
  newDefinitions: any; // read with bpmn-moddle
  xmlMain = `<?xml version="1.0" encoding="UTF-8"?><definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" targetNamespace="" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL http://www.omg.org/spec/BPMN/2.0/20100501/BPMN20.xsd">
  <process id="Process_0p4lm07" flowable:class="####com.bone.dms.service.EmailDocumentService"/>
  <bpmndi:BPMNDiagram id="sid-74620812-92c4-44e5-949c-aa47393d3830">
    <bpmndi:BPMNPlane id="sid-cdcae759-2af7-4a6d-bd02-53f3352a731d" bpmnElement="Process_0p4lm07"/>
    <bpmndi:BPMNLabelStyle id="sid-e0502d32-f8d1-41cf-9c4a-cbb49fecf581">
      <omgdc:Font name="Arial" size="11" isBold="false" isItalic="false" isUnderline="false" isStrikeThrough="false"/>
    </bpmndi:BPMNLabelStyle>
    <bpmndi:BPMNLabelStyle id="sid-84cb49fd-2f7c-44fb-8950-83c3fa153d3b">
      <omgdc:Font name="Arial" size="12" isBold="false" isItalic="false" isUnderline="false" isStrikeThrough="false"/>
    </bpmndi:BPMNLabelStyle>
  </bpmndi:BPMNDiagram>
</definitions>`;

  canvas = (this.bpmnJS.get('canvas') as Canvas);
  elementFactory = (this.bpmnJS.get('elementFactory') as any);
  modeling = (this.bpmnJS.get('modeling') as any);
  elementRegistry = (this.bpmnJS.get('elementRegistry') as any);
  moddle = (this.bpmnJS.get('moddle') as any);


  constructor(private http: HttpClient) {
    this.bpmnJS.on<ImportDoneEvent>('import.done', ({ error }) => {
      if (!error) {
        this.bpmnJS.get<Canvas>('canvas').zoom('fit-viewport');
      }
    });
  }

  ngAfterContentInit(): void {
    this.bpmnJS.attachTo(this.el.nativeElement);
    this.setupEventListeners();
    
  }

  ngOnInit(): void {
    if (this.url) {
      this.loadUrl(this.url);
    }
    // this.importDiagram(this.xmlMain)
  }

  ngOnChanges(changes: SimpleChanges) {
    // re-import whenever the url changes
    if (changes.url) {
      this.loadUrl(changes.url.currentValue);
    }
    this.setTask();
  }

  ngOnDestroy(): void {
    this.bpmnJS.destroy();
  }

  private setupEventListeners(): void {
    const eventBus = this.bpmnJS.get('eventBus') as any;

    // Subscribe to element click events
    eventBus.on('element.click', (event) => {
      console.log('Clicked element:', event.element);
      this.currElement = event.element 
      // You can access various properties of the clicked element
      // For example, event.element.id or event.element.type
    });

    eventBus.on('commandStack.changed', (data: any) => {
      console.log('Command stack changed:', data);
      setTimeout(() =>{
        // this.setTask();

      }, 1000) 
    });
    
  }

  /**
   * Load diagram from URL and emit completion event
   */
  loadUrl(url: string) {

    this.importDiagram(this.xmlMain)

    // return (
    //   this.http.get(url, { responseType: 'text' }).pipe(
    //     switchMap((xml: string) => this.importDiagram(xml)),
    //     map(result => result.warnings),
    //   ).subscribe(
    //     (warnings) => {
    //       this.importDone.emit({
    //         type: 'success',
    //         warnings
    //       });
    //     },
    //     (err) => {
    //       this.importDone.emit({
    //         type: 'error',
    //         error: err
    //       });
    //     }
    //   )
    // );
  }

  addTextAnnotationToTask( var1: string ): void {
    console.log("::::",this.bpmnJS)
    const task = this.elementRegistry.get(this.currElement.id);
    if (!task) {
      console.error('Task not found')
      return;
    }

    console.log("###", task)
    console.log("PARENT ID###", task.parent)

    const textAnottation = this.elementFactory.createShape({
      type: 'bpmn:TextAnnotation',
      businessObject: this.moddle.create('bpmn:TextAnnotation',
        {
          text: var1
        })
    })
    const position = { x: 500, y: 100 };
    this.modeling.createShape(textAnottation, position, task.parent)

    const association = this.elementFactory.createConnection({
      type:"bpmn:Association",
      source: task,
      target: textAnottation,
      businessObject: this.moddle.create('bpmn:Association',
        {
          sourceRef: task.businessObject,
          targetRef: textAnottation.businessObject
        })
    });
    

    console.log("###222", association)
    this.modeling.createConnection(association, task, textAnottation, association.parent)
  }

  inputTask(var1: string): void {
    // Assume `this.bpmnJS.saveXML` is used to get the current XML
    this.bpmnJS.saveXML({ format: true }).then(({ xml }) => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, "application/xml");
      const canvas = (this.bpmnJS.get('canvas') as any);
      const elementFactory = (this.bpmnJS.get('elementFactory') as any);
      const modeling = (this.bpmnJS.get('modeling') as any);
      const elementRegistry = (this.bpmnJS.get('elementRegistry') as any);
      const moddle = (this.bpmnJS.get('moddle') as any);
    
      // Check for parsing errors
      if (xmlDoc.getElementsByTagName("parsererror").length) {
        console.error("Error parsing XML");
        return; // Exit if there's a parsing error
      }

      const processElementModel = elementRegistry.get(canvas.getRootElement().id);

      const processElement = xmlDoc.getElementsByTagName("process")[0];
      if (!processElement) {
        console.error("Process element not found.");
        return null;
      }
  
      // Access <sequenceFlow> elements
      const sequenceFlows = xmlDoc.getElementsByTagName("sequenceFlow");
  
      // Iterate over each <sequenceFlow> element and add the var1 attribute
      for (let i = 0; i < sequenceFlows.length; i++) {

        sequenceFlows[i].setAttribute("sourceRef", var1);
        const conditionExpression = xmlDoc.createElementNS("http://www.omg.org/spec/BPMN/20100524/MODEL", "bpmn:conditionExpression");
        conditionExpression.textContent = "${pathDecision == 'toTask1'}"
        conditionExpression.appendChild(sequenceFlows[i]);
      }

      // Create a <bpmn:TextAnnotation> element
      const textAnnotation = xmlDoc.createElementNS("http://www.omg.org/spec/BPMN/20100524/MODEL", "bpmn:TextAnnotation");
      textAnnotation.setAttribute("id", 'ID=1');

      // Create a <bpmn:text> element and set its content
      const textElement = xmlDoc.createElementNS("http://www.omg.org/spec/BPMN/20100524/MODEL", "bpmn:text");
      textElement.textContent = var1;
      
      // Append the <bpmn:text> element to <bpmn:TextAnnotation>
      textAnnotation.appendChild(textElement);

      // Append the <bpmn:TextAnnotation> to the <process> element
      processElement.appendChild(textAnnotation);
  
      // Serialize the modified XML DOM back to a string
      const serializer = new XMLSerializer();
      const modifiedXml = serializer.serializeToString(xmlDoc);
      console.log("@@@@ NOVI XML",modifiedXml);

      const task = elementRegistry.get(this.currElement.id);
      if (!task) {
        console.error('Task not found');
        return;
      }

      const textAnnotationModel = elementFactory.createShape({
        type: 'bpmn:TextAnnotation',
        businessObject: moddle.create('bpmn:TextAnnotation', {
          id: 'shape12312312312312',
          text: var1
        })
      });

      const position = { x: 500, y: 100 };

      // Add the TextAnnotation to the diagram
      modeling.createShape(textAnnotationModel, position, task.parent);

      // Optionally, create an Association between the TextAnnotation and the task
      const association = elementFactory.createConnection({
        type: 'bpmn:Association',
        source: task,
        target: textAnnotationModel,
        businessObject: moddle.create('bpmn:Association', {
          id: 'association123233',
          sourceRef: task.businessObject,
          targetRef: textAnnotationModel.businessObject
        })
      });

      modeling.createConnection(association, task, textAnnotationModel, task.parent);

      // Optionally, re-import the modified XML into the bpmn-js modeler
      // this.bpmnJS.importXML(modifiedXml, (err) => {
      //   if (err) {
      //     console.error('Error re-importing the modified diagram', err);
      //   } else {
      //     console.log('Modified diagram re-imported successfully');
      //   }
      // });
    }).catch((err: Error) => {
      console.error('Error saving diagram:', err);
    });
  }
  

  modifyXML(xml: string): string {
    // Example modification: Adding a custom attribute to the <definitions> element
    const parser = new DOMParser();
    console.log("===== 2 test", xml);
    const xmlDoc = parser.parseFromString(xml, "application/xml");

    // Check for parsing errors
    if (xmlDoc.getElementsByTagName("parsererror").length) {
      console.error("Error parsing XML");
      return xml; // Return original XML if there's a parsing error
    }

    // Modify the XML DOM as needed
    let processElement = xmlDoc.getElementsByTagName("process")[0];
    console.log("### PROCESI :::", processElement);
    const childElemets = processElement.children;

    if (processElement) {
      for (let i = 0; i < childElemets.length; i++) {
        console.log("TAGOVI ###", childElemets[i].tagName)

      }
      processElement.setAttribute("flowable:class", "####com.bone.dms.service.EmailDocumentService");
    }

    // Serialize the modified XML DOM back to a string
    const serializer = new XMLSerializer();
    return serializer.serializeToString(xmlDoc);
  }

  // Add to DiagramComponent

  saveXML(): void {
    // console.log('Saving Diagram diagram...', this.bpmnJS);
    this.bpmnJS.saveXML({ format: true }).then(({ xml }) => {
      let modifiedXML = this.modifyXML(xml);
      this.downloadFile(modifiedXML, 'diagram.bpmn');
    }).catch((err: Error) => {
      console.error('Error saving diagram:', err);
    });
  }


  private downloadFile(data: string, filename: string): void {
    const blob = new Blob([data], { type: 'application/xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
  }

  setTask(): void {
    console.log("CURRENT: " + this.currElement)
    const elementRegistry = this.bpmnJS.get('elementRegistry') as any;
    console.log("EL REG: ", elementRegistry)
    const modeling = this.bpmnJS.get('modeling') as any;

    // Find all User Tasks and set their color to blue
    elementRegistry.forEach((element: any) => {
      console.log("ELEMENTI ::::", element)
      if (element.type === 'bpmn:UserTask') {
        console.log("THIS ELEMENT ::::", element)
        modeling.setColor([element], {
          stroke: 'black',
          fill: 'orange' // Set the fill color to blue
        });
      } else if (element.type === "bpmn:ServiceTask") {
        modeling.setColor([element], {
          stroke: 'black',
          fill: 'green' // Set the fill color to blue
        });
      }
    });

  }

  compareDiagrams(diagramXML1: string, diagramXML2: string): void {
    const moddle = new BpmnModdle();

    Promise.all([
      moddle.fromXML(diagramXML1),
      moddle.fromXML(diagramXML2)
    ]).then(([result1, result2]) => {
      const definitions1 = result1.rootElement;
      const definitions2 = result2.rootElement;

      // Use bpmn-js-differ to find differences
      const changes = diff(definitions1, definitions2);

      console.log(changes); // Log the differences
    }).catch(err => {
      console.error('Error comparing diagrams:', err);
    });
  }


  changeTask(): void {
    console.log("CURRENT: " + this.currElement)
    const elementRegistry = this.bpmnJS.get('elementRegistry') as any;
    console.log("EL REG: ", elementRegistry)
    const modeling = this.bpmnJS.get('modeling') as any;


    const taskId = this.currElement.id;
    const task = elementRegistry.get(taskId);

    if (task) {
      modeling.updateProperties(task, {
        type: 'bpmn:UserApproveTask'
      });
    }
  }


  /**
   * Creates a Promise to import the given XML into the current
   * BpmnJS instance, then returns it as an Observable.
   *
   * @see https://github.com/bpmn-io/bpmn-js-callbacks-to-promises#importxml
   */
  private importDiagram(xml: string): Observable<ImportXMLResult> {
    return from(this.bpmnJS.importXML(xml));

  }
}
