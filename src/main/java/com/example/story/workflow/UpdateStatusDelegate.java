package com.example.story.workflow;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * This delegate is kept for BPMN diagram clarity.
 * Actual status updates are now handled by Kafka consumer (StoryConsumer).
 */
@Component
public class UpdateStatusDelegate implements JavaDelegate {

    private static final Logger log = LoggerFactory.getLogger(UpdateStatusDelegate.class);

    @Override
    public void execute(DelegateExecution execution) throws Exception {
        log.info("UpdateStatusDelegate called - Status updates are now handled by Kafka consumer");
        // Status update logic moved to StoryConsumer.handleStoryApproved()
        // This delegate exists only for BPMN diagram clarity
    }
}
