# Starter Dockerfile. Update image tag according to your licensed IRIS environment.
FROM containers.intersystems.com/intersystems/iris-community:latest

USER root
RUN mkdir -p /opt/irisbuild/src /opt/irisbuild/tests
COPY src /opt/irisbuild/src
COPY tests /opt/irisbuild/tests
COPY module.xml /opt/irisbuild/module.xml
RUN chown -R ${ISC_PACKAGE_MGRUSER}:${ISC_PACKAGE_IRISGROUP} /opt/irisbuild
USER ${ISC_PACKAGE_MGRUSER}

# Import/compile can be performed via iris session, ZPM, or your CI pipeline.
# This starter image intentionally leaves compilation explicit for coding agents.
