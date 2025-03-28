```mermaid
flowchart TB
    subgraph VPC["AWS VPC"]
        subgraph PublicSubnets["Public Subnets"]
            ALB["Application Load Balancer"]
            Bastion["Bastion Host"]
        end
        
        subgraph PrivateSubnets["Private Subnets"]
            subgraph ECS["Amazon ECS Cluster"]
                subgraph ApiServices["API Services"]
                    direction LR
                    AuthContainer["Auth Service<br>Container"]
                    ProjectContainer["Project Service<br>Container"]
                    ApiGatewayContainer["API Gateway<br>Container"]
                end
                
                subgraph ProcessingServices["Processing Services"]
                    direction LR
                    SeparationContainer["Source Separation<br>Container"]
                    LyricsContainer["Lyrics Extraction<br>Container"]
                    MidiContainer["MIDI Conversion<br>Container"]
                    SegmentationContainer["Voice Segmentation<br>Container"]
                end
            end
        end
        
        subgraph DataServices["Data Services"]
            RDS[(Amazon RDS<br>PostgreSQL)]
            ElastiCache[(ElastiCache<br>Redis)]
            S3["S3 Buckets<br>Audio Storage"]
        end
        
        subgraph MonitoringServices["Monitoring & Scaling"]
            CloudWatch["CloudWatch"]
            AutoScaling["Auto Scaling"]
        end
    end
    
    subgraph ExternalServices["External Services"]
        Route53["Route 53<br>DNS"]
        CloudFront["CloudFront<br>CDN"]
        ECR["Elastic Container<br>Registry"]
        SNS["SNS<br>Notifications"]
    end
    
    %% External connections
    Route53 --> CloudFront
    CloudFront --> ALB
    ECR -.-> ECS
    
    %% Internal connections
    ALB --> ApiGatewayContainer
    
    ApiGatewayContainer --> AuthContainer
    ApiGatewayContainer --> ProjectContainer
    
    AuthContainer --> RDS
    AuthContainer --> ElastiCache
    
    ProjectContainer --> RDS
    ProjectContainer --> S3
    ProjectContainer --> ProcessingServices
    
    SeparationContainer --> S3
    LyricsContainer --> S3
    MidiContainer --> S3
    SegmentationContainer --> S3
    
    SeparationContainer --> SNS
    LyricsContainer --> SNS
    MidiContainer --> SNS
    SegmentationContainer --> SNS
    
    ECS --> CloudWatch
    RDS --> CloudWatch
    ElastiCache --> CloudWatch
    
    CloudWatch --> AutoScaling
    AutoScaling --> ECS
    
    classDef vpc fill:#EEEEEE,stroke:#333,stroke-width:1px;
    classDef public fill:#FFD166,stroke:#333,stroke-width:1px;
    classDef private fill:#06D6A0,stroke:#333,stroke-width:1px;
    classDef api fill:#118AB2,stroke:#333,stroke-width:1px;
    classDef processing fill:#EF476F,stroke:#333,stroke-width:1px;
    classDef data fill:#073B4C,stroke:#333,stroke-width:1px,color:#fff;
    classDef monitoring fill:#9B5DE5,stroke:#333,stroke-width:1px;
    classDef external fill:#F0C089,stroke:#333,stroke-width:1px;
    
    class VPC vpc;
    class PublicSubnets,ALB,Bastion public;
    class PrivateSubnets,ECS private;
    class ApiServices,AuthContainer,ProjectContainer,ApiGatewayContainer api;
    class ProcessingServices,SeparationContainer,LyricsContainer,MidiContainer,SegmentationContainer processing;
    class DataServices,RDS,ElastiCache,S3 data;
    class MonitoringServices,CloudWatch,AutoScaling monitoring;
    class ExternalServices,Route53,CloudFront,ECR,SNS external;
```