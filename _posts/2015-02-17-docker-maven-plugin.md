---
layout: post
title :  Docker maven plugin
category : programming
tags : [Java, Maven, Docker]
---
{% include JB/setup %}
As Docker is gathering more interest from the big IT companies, it seems to be a perfect way to 
delivery the applications to the production environemnt. If until now the maven artifct was the 
jar or war, now it looks natural the artifact should be the docker image. In fact this strategy
is not new: Netflix was, and still does, deliver its application, as AMI images tagged with
the verion and other build informations.

With Docker this approach become easier so that everyone can adopt it without the big Netflix 
infrastructure. The question is now, how to make our build generate the docker imag for us? If
we are using maven, the Spotify [docker-maven-plugin](https://github.com/spotify/docker-maven-plugin) 
comes in handy here. it is able to build an image, tag it and push it on a public or private 
docker registry.

It provides three goals:
 
 - build
 - tag
 - push
 
It is possible to push also from the tag or the build goal, and it is possible to tag also from 
the build goal. It uses under the hood the spotify [docker-client](https://github.com/spotify/docker-client) library backed by Jersey client.

Let take a look how to apply this plugin to the Maven lifecycle: the phases we need are three: 
 
 - package
 - install
 - deploy
 
First of all we have to add the plugin block under our build/plugins block:

{% highlight xml %}
<plugin>
  <groupId>com.spotify</groupId>
  <artifactId>docker-maven-plugin</artifactId>
  <version>0.1.2</version>
  <executions>
    <!-- ... -->
  </executions>
</plugin>  
{% endhighlight %}


Similary for what happen for the jar, we would like our artifact to be built as part of the package
phase. So lets bind an execution to the package phase. Assuming that the build is generating a packaged
application myapp.tar.gz and that we have our Dockerfile in /src/main/docker: 

{% highlight xml %}
<execution>
    <id>build-docker-image</id>
    <phase>package</phase>
    <goals>
        <goal>build</goal>
    </goals>

    <configuration>
        <imageName>myuser/myapp</imageName>
        <dockerDirectory>${project.basedir}/src/main/docker</dockerDirectory>
        <!-- The `tagInfoFile` is required apparently because of a bug in the `tag` mojo. -->
        <tagInfoFile>${project.build.directory}/docker_image_info.json</tagInfoFile>
        <resources>
            <resource>
                <targetPath>/</targetPath>
                <directory>${project.build.directory}</directory>
                <include>myapp.tar.gz</include>
            </resource>
        </resources>
    </configuration>

</execution>
{% endhighlight %}

The resources block can be used to add all the resources we need in our docker image. There is 
also an alternative way to build image, using th xml to define the docker commands, but I will
prefere using the external Dockerfile, as it looks more familiar to the people accustomised to
Docker already.

At the eand of the package phase we will have the `myuser/myapp:latest` image built on docker.
however we want our image taggeg with the project version, don't we? We can achieve it in the 
same `build` goal but in my opinion, the install phase is a better fit for that.

Before the install phase, we can actually use the generated image for our functional or 
integration tests, maybe using the `docker-client` Spotify library. How the install phase 
looks like? here it is:

{% highlight xml %}
<execution>
    <id>tag-docker-image</id>
    <phase>install</phase>
    <goals>
        <goal>tag</goal>
    </goals>

    <configuration>
        <tagInfoFile>${project.build.directory}/docker_image_info.json</tagInfoFile>
        <image>myuser/myapp</image>
        <newName>myuser/myapp:${project.version}</newName>
    </configuration>
</execution>
{% endhighlight %}

The `image` parameter should match with the `build` goal `imageName` parameter, if the tag 
is omitted, the `latest` is assumed. 

At the end of the install phase, we will have our image built and tagged in the docker host,
now we can decide if we want to push on a remote docker registry. To push to a remote registry 
we need actually to rename the image, because we need to add the namespace in front of it. So 
we are going to reuse the `tag` goal again:

{% highlight xml %}
<execution>
    <id>push-docker-image</id>
    <phase>deploy</phase>
    <goals>
        <goal>tag</goal>
    </goals>

    <configuration>
        <tagInfoFile>${project.build.directory}/docker_image_info.json</tagInfoFile>
        <image>myuser/myapp:${project.version}</image>
        <newName>quay.io/myuser/myapp:${project.version}</newName>
        <pushImage>true</pushImage> <!-- We are also pushing this time -->
    </configuration>
</execution>
{% endhighlight %}

Since the [0.1.2 version, released today](https://github.com/spotify/docker-maven-plugin/issues/53#issuecomment-74712040), it is possible to specify the remote registry 
credentials only using maven properties at the moments, but they are enough flexible to
permit you using systen environment on your CI server for example.

I must say Spotify has done a great job to delivery this plugin, in perfect accordance 
with the open source spirit.





