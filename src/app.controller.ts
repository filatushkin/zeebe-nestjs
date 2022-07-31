import { Controller, Get, Inject, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { ZBClient, ZBWorker, ICustomHeaders, IInputVariables, IOutputVariables, CompleteFn } from 'zeebe-node';
import { ZEEBE_CONNECTION_PROVIDER, ZeebeWorker, ZeebeJob } from 'nestjs-zeebe';
import {
    Ctx,
    Payload,
} from '@nestjs/microservices';

import {
  Job,
} from 'zeebe-node/interfaces';
import * as Grpc_deprecated from 'zeebe-node/dist/lib/interfaces-grpc';
import * as Grpc from 'zeebe-node/dist/lib/interfaces-grpc-1.0';

export interface EmailJobData {
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface Headers {
  'email:template': string;
}


@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService, 
    @Inject(ZEEBE_CONNECTION_PROVIDER) private readonly zbClient: ZBClient
  ) {}

  // index
  @Get('/')
  getHello() {
    return this.appService.getHello();
  }

  // Deploy bpm 
  // Use the client to create a new workflow instance
  @Get('/deploy')
  deploy() : Promise<Grpc.DeployProcessResponse> {
    return this.zbClient.deployProcess('./bpmn/order.process.bpmn'); //HARDCODED
  }

  // Use the client to create a new workflow instance
  @Get('/order-process')
  orderProcess() : Promise<Grpc.CreateProcessInstanceResponse> {
      return this.zbClient.createProcessInstance('order.process', { orderStatus: 'new'}); 
  }

  // Process can be cancelled by this function
  @Get('/cancel-process/:processInstanceKey')
  cancelProcessInstance(@Param() param) : Promise<void> {
      const { processInstanceKey } = param;
      return this.zbClient.cancelProcessInstance(processInstanceKey);
  }

  @Get('/send-message/:name')
  sendEvent(@Param() param) : Promise<Grpc.PublishMessageResponse> {
      const { name } = param;
      return this.zbClient.publishMessage({
        /** Should match the "Message Name" in a BPMN Message Catch  */
        name: name,
        /** The value to match with the field specified as "Subscription Correlation Key" in BPMN */
        correlationKey: "one", //HARDCODED
        /** The number of seconds for the message to buffer on the broker, awaiting correlation. Omit or set to zero for no buffering. */
        timeToLive: 0,
        /** Unique ID for this message */
        variables: {text:"Some info"} //HARDCODED
    });
  }

  // Subscribe to events of type 'payment-service
  @ZeebeWorker('payment:send')
  paymentService(@Payload() job: ZeebeJob, @Ctx() context: { complete: CompleteFn<IOutputVariables>, worker: ZBWorker<IInputVariables, ICustomHeaders, IOutputVariables> }) {
      console.log('Payment-service, Task variables', job.variables);
      let updatedVariables = Object.assign({}, job.variables, {
        orderStatus: 'paid',
      });

      // Task worker business logic goes here

      job.complete(updatedVariables);
  }

  // Subscribe to events of type 'inventory-service and create a worker with the options as passed below (zeebe-node ZBWorkerOptions)
  @ZeebeWorker('inventory:check', { maxJobsToActivate: 10, timeout: 300 })
  inventoryService(@Payload() job: ZeebeJob, @Ctx() context: { complete: CompleteFn<IOutputVariables>, worker: ZBWorker<IInputVariables, ICustomHeaders, IOutputVariables> }) {
      console.log('inventory-service, Task variables', job.variables);
      let updatedVariables = Object.assign({}, job.variables, {
        orderStatus: 'shipped',
        approve: 1,
        source:1
      });

      // Task worker business logic goes here
      job.complete(updatedVariables);
  }

  // Subscribe to events of type 'email:send'
  @ZeebeWorker('email:send', {
      fetchVariable: ['email'],
  })
  //async emailService(job: Job<EmailJobData, Headers>, complete) {
  async emailService(@Payload() job: ZeebeJob, @Ctx() context: { complete: CompleteFn<IOutputVariables>, worker: ZBWorker<IInputVariables, ICustomHeaders, IOutputVariables> }) {
      const template = job.customHeaders['email:template'];

      console.log('Email-service, template', template);
      console.log('Email-service, ask variables', job.variables);

      try {
          console.log('sending email ...');
      } catch (e) {
          return job.fail(e.message);
      }

      let updatedVariables = Object.assign({}, job.variables, {
        orderStatus: 'complete',
      });

      job.complete(updatedVariables);
  }
}
